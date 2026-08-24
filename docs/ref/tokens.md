# Tokens

Source: `DESIGN.md` §6.1, read from `eyvar_ops_panel_v40_fixed.html:11–21`.

## Colour — all 24 exist today

| Token | Value | Use for |
|---|---|---|
| `--bg` | `#EEF0F3` | Page canvas |
| `--sb-bg` | `#EEF0F3` | Sidebar |
| `--bg2` | `#F8F8F5` | Subdued fills — table headers, footers, icon buttons |
| `--white` | `#fff` | Card / surface |
| `--border` | `#E4E2DA` | Hairline |
| `--border2` | `#DDDBD3` | Stronger hairline, input borders |
| `--ink` | `#1A1A18` | Primary text (17.43:1) |
| `--muted` | `#6B6B68` | Secondary text (5.35:1 — **use this, not `--ghost`**) |
| `--ghost` | `#9B9B97` | **2.79:1 — fails contrast. Not for text.** |
| `--blue` | `#185FA5` | Primary action (R3) |
| `--blue-lt` | `#E6F1FB` | Info tint |
| `--blue-dk` | `#0C447C` | Links (+ underline) |
| `--green` / `--green-lt` | `#27500A` / `#EAF3DE` | Success |
| `--amber` / `--amber-lt` / `--amber-dk` / `--amber-border` | `#E8A33D` / `#FAEEDA` / `#633806` / `#E0B368` | Warning |
| `--red` / `--red-lt` / `--red-border` | `#A32D2D` / `#FCEBEB` / `#E8A9A9` | Critical — only where R5a permits |
| `--teal` / `--teal-lt` | `#0B6B6B` / `#E1F5EE` | Legacy extra tone |
| `--purple` / `--purple-lt` | `#4A2889` / `#EDE6FB` | Legacy extra tone |
| `--navy` | `#3D434B` | Logo / section text |

## What does NOT exist yet

**Radius, spacing, font-size, shadow, duration, z-index have no tokens.** `:root` holds
colours and nothing else (defect D16).

Until that set exists these categories are **frozen**: reuse a value already in the CSS and
note it on the D16 ticket, or extend `styles/tokens.css` deliberately in the same commit
and say so in your handoff. What you may not do is inline the value and move on — that is
exactly how the legacy file reached 36 off-token colours, 15 font sizes and 13 radii
(D12–D14).

## Rules

- Every colour in a `.module.css` is `var(--token)`. No exceptions.
- New token → `styles/tokens.css`, same commit, mentioned in the handoff.
- Run `/token-audit` before you hand anything off.
- `--ghost` on any background fails 4.5:1. It is used 431 times in the legacy app for text;
  do not carry that across. Substitute `--muted`, which already exists and passes.
