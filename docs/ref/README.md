# Quick reference

Small lookup files. `DESIGN.md` is 5,692 lines — do not read it to check one rule. Read
the file here, and open the `DESIGN.md` section only when you need the reasoning or the
evidence behind it.

| File | Answers | Lines |
|---|---|---|
| [rulings.md](rulings.md) | "The sections disagree — which wins?" | ~30 |
| [tokens.md](tokens.md) | "What value do I use? Does a token exist?" | ~45 |
| [patterns.md](patterns.md) | "What shape is this screen?" | ~40 |
| [surfaces.md](surfaces.md) | "Toast, banner, modal, drawer, or page?" | ~35 |
| [states.md](states.md) | "Which states must I build?" | ~35 |
| [copy.md](copy.md) | "How do I word this?" | ~40 |
| [a11y.md](a11y.md) | "Does this pass? What ratio is this token?" | ~45 |
| [rtl.md](rtl.md) | "Does this mirror in Arabic?" | ~40 |
| [defects.md](defects.md) | "Is this a known legacy defect or a new one?" | ~45 |
| [screenshots.md](screenshots.md) | "Where's a real example of this pattern?" | ~40 |
| [modules.md](modules.md) | "Which doc describes this part of the product?" | ~60 |

## Precedence, in one line

**Rulings → §6.2 sanctioned deviations → §7–§9 → §1–§5.**

A MUST in §1–§5 describes *Shopify*, not Eyvar. It binds only where §6 adopts it. Never
cite a §1–§5 pixel figure in review — R13 voids them.

## The five things most often got wrong

1. A literal value in CSS instead of a token — and only colours are tokenised today.
2. Shipping the happy path without the empty, loading, and error states.
3. `margin-left` instead of `margin-inline-start`. The product ships Arabic.
4. `outline: none` with nothing put back.
5. A red badge. There is no red badge (R5a).

## Maintaining these

These files are hand-written summaries, not generated. When `DESIGN.md` changes, the
matching ref file is updated in the same commit or it becomes a lie — and a lie here is
worse than no file, because people trust short documents.
