# Arabic / RTL

Source: `DESIGN.md` §9. The product ships Arabic. Physical directions are a defect on
arrival, not a polish item.

## The mandate

Logical only. Never `left` or `right`.

| Never | Always |
|---|---|
| `ml-*` / `mr-*` | `ms-*` / `me-*` |
| `pl-*` / `pr-*` | `ps-*` / `pe-*` |
| `left-*` / `right-*` | `start-*` / `end-*` |
| `text-left` / `text-right` | `text-start` / `text-end` |
| `border-l` / `border-r` | `border-s` / `border-e` |
| `rounded-l-*` / `rounded-r-*` | `rounded-s-*` / `rounded-e-*` |

**The CLI does this for you on add.** With `"rtl": true` in `components.json`, shadcn
converts physical classes to logical ones as it copies a component in. Verify the flag is
still on before adding anything — if it was ever off, every component added since is
suspect. Hand-written code is not covered: `/token-audit` catches that.

Same in prose: a spec that says "the badge sits on the right" is ambiguous. Say
inline-end.

## Does it mirror?

| Thing | Mirrors? |
|---|---|
| Layout, chrome, nav, toolbars, drawers, toast corner | **Yes** |
| **Numeral runs** — `1,234.56` | No — the bidi algorithm lays digits LTR inside an RTL line |
| **Digit system** | Western `0`–`9`, not Arabic-Indic. Saudi digital convention |
| **Currency position** | Locale data decides; Eyvar currently hard-codes `SAR` as a suffix at 92 call sites |
| **Dates, times** | No — numeric runs. The *cell* aligns inline-start; the string does not reorder |
| **Phone numbers, IDs, IBANs, plates** | No — single LTR tokens; needs bidi isolation or a leading `+` jumps sides |
| **Keyboard chips** (`⌘ K`) | Position mirrors, glyph order does not |
| **Map canvas, markers, routes, compass** | No — north is up, east is right in every locale. Map *chrome* mirrors |
| **Code / query editors** | No — syntax is LTR by specification |
| **Chart plot areas and axes** | No — a reversed time axis makes axis and numbers run opposite ways |
| **Delta arrows ↑ ↓** | No — vertical magnitude, not reading direction |
| **Media glyphs, logos, photos, QR** | No — `▶` means *forward in time* |

## Known live defects (§9)

Three real bugs in the current app, worth not reproducing:

1. `.sb-sec-lbl` keeps `padding-left:16px` in Arabic — nine translated labels flush to the
   wrong edge (`:39`).
2. `.sb-badge`'s `margin-right:12px` is destroyed by the RTL override (`:48` vs `:385`).
3. The toast's `translateX(28px)` never got the corner flip (`:5288`, `:5254`) — Arabic
   toasts slide in *away* from their own anchor.

## Checking a screen

Load it with `dir="rtl"` and look. Icon on the wrong side, collapsed margin, a number that
reordered, a toast entering from the wrong edge. Five minutes, and it catches what no
English capture can.
