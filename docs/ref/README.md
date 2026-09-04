# Quick reference

Small lookup files. `DESIGN.md` is too large to read whole — do not read it to check one
rule. Read the file here; for a section's full text read its partial in
`docs/06-design-reference/_partials/`. Which rule wins is `docs/RULINGS.md`.

> **⚠ `DECISIONS.md` D7 — the visual reference changed (Shopify → Navattic).**
> **[`design/03-navattic-language.md`](../05-restructure/design/03-navattic-language.md) §1
> is the token set** — every `--ev-*` value with its measurement or its derivation.
> `tokens.md` below is **stale on values** (the names are all still right) and `a11y.md`'s
> ratios were recomputed in §7 of that spec. §7–§9 of `DESIGN.md` are untouched and still
> bind in full. Do not ship a re-skin that drops a ratio.

| File | Answers | Lines |
|---|---|---|
| [rulings.md](rulings.md) | "The sections disagree — which wins?" | ~30 |
| [tokens.md](tokens.md) | "What value do I use? Does a token exist?" — **values superseded by D7** | ~45 |
| [patterns.md](patterns.md) | "What shape is this screen?" | ~40 |
| [surfaces.md](surfaces.md) | "Toast, banner, modal, drawer, or page?" | ~35 |
| [states.md](states.md) | "Which states must I build?" | ~35 |
| [copy.md](copy.md) | "How do I word this?" | ~40 |
| [a11y.md](a11y.md) | "Does this pass? What ratio is this token?" | ~45 |
| [rtl.md](rtl.md) | "Does this mirror in Arabic?" | ~40 |
| [defects.md](defects.md) | "Is this a known legacy defect or a new one?" | ~45 |
| [screenshots.md](screenshots.md) | "Where's a real example of this pattern?" | ~40 |
| [components.md](components.md) | "Which shadcn component, and how do I restyle it?" | ~55 |
| [modules.md](modules.md) | "Which doc describes this part of the product?" | ~60 |

## The second set — surfaces the rounds 13–18 audits opened

These summarise `design/13`–`design/18` and the reconciled audit, not `DESIGN.md`. They
carry live line numbers into `src/`, so re-grep before citing one.

| File | Answers | Lines |
|---|---|---|
| [table.md](table.md) | "What breaks if I touch `DataTable`?" — the four live defects | ~79 |
| [i18n.md](i18n.md) | "Is this string translatable at all?" — the key inventory and the four gaps | ~75 |
| [verify.md](verify.md) | "Is this claimed defect real?" — and the nine that were not | ~73 |
| [motion.md](motion.md) | "May this move, and for how long?" | ~70 |
| [pwa.md](pwa.md) | "What may be cached, and what may queue?" | ~66 |
| [api.md](api.md) | "What does the backend have to return?" — the 284-endpoint contract | ~70 |

## Precedence, in one line

**Owner rulings and decisions (`docs/RULINGS.md`) → `DESIGN.md` Rulings → §6.2 sanctioned
deviations → §7–§9 → §1–§5.** The full index of rulings, decisions and ID namespaces is
`docs/RULINGS.md`.

A MUST in §1–§5 describes *Shopify*, not Eyvar. It binds only where §6 adopts it. Never
cite a §1–§5 pixel figure in review — R13 voids them.

## The six things most often got wrong

1. **`text-gray-500`.** Tailwind's palette is not your palette. Semantic slots only.
2. Using a shadcn component as it arrived, without restyling it to `DESIGN.md`.
3. Shipping the happy path without the empty, loading, and error states.
4. `ml-4` instead of `ms-4`. The product ships Arabic.
5. `outline-none` with no `focus-visible:ring`.
6. A red badge. There is no red badge (R5a).

## Maintaining these

These files are hand-written summaries, not generated. When `DESIGN.md` changes, the
matching ref file is updated in the same commit or it becomes a lie — and a lie here is
worse than no file, because people trust short documents.
