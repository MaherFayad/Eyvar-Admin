# Rulings — the tiebreakers

19 rulings settle places the sources disagree. They sit at the top of the precedence
ladder: a ruling beats every section. Full text and reasoning: `DESIGN.md` → *Rulings on
contested points*.

| # | Ruling |
|---|---|
| R1 | Banners are **pale tinted cards**, never the saturated split-strip. |
| R2 | Save is the **brand-blue primary**. Never green. Never white-on-white. |
| R3 | Primary action is **`--blue`**, not Shopify's near-black. Links therefore get `--blue-dk` **+ underline** so the two roles stay separable. |
| R4 | Numeric, currency and count columns are **right-aligned**, tabular figures. Does **not** flip in Arabic. |
| R5 | **No red badge** for lifecycle state. |
| R5a | Red appears in exactly **four** places: a destructive button, one page-level critical banner, a breached-row leading edge marker, a map marker. A fifth use needs a §6.2 entry. |
| R6 | Full sentences take a period. Fragments, labels and buttons do not. |
| R7 | **Five badge tones**: success, warning, info, neutral, new. No sixth. No critical. |
| R8 | Illustration **only** on a whole-page, zero-records-ever empty state. Empty cards get one grey sentence. |
| R9 | A toast is **one line naming the object exactly**, ≤60 characters. Truncate the object, never the verb. |
| R10 | **One event, one surface**, by lifetime: transient → toast, standing condition → banner. Never two page-level banners. |
| R11 | Shopify's nav is ~240px. (Does not bind Eyvar — see deviation D-4.) |
| R12 | §1.6 (motion) is **SHOULD, not citable in review**. Binding motion rules are §7.6 and §8.1. |
| R13 | **No pixel figure in §1–§5 is binding.** They came from 768px screenshots. What binds: relationships, the 4px grid, and §6.1 tokens. |
| R14 | `Paid` is **success (green)**. One label, one tone, always. |
| R15 | Badges, toasts and avatars are **rounded rectangles (~8px)** — never stadium pills, never circles. |
| R16 | All four banner tones are pale tinted cards. The "info banners carry no fill" MUST is void. |
| R17 | **One warning tone.** Separate "waiting on them" from "waiting on you" with the label, not a second fill. |
| R18 | §1.6 governs transitions only. An ambient loop is licensed **only** for "this feed is live": opacity-only, 1200–2500ms, never below 0.4 opacity, and it may **never encode severity**. |

## Using them

Cite the number. "This is R9" ends an argument; "the toast feels long" does not.

If you hit a collision the ladder does not settle, that is a defect in `DESIGN.md` —
report it, do not improvise a nineteenth ruling in a code review.
