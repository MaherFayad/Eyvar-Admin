# Rulings — the tiebreakers

20 rulings settle places the sources disagree. They sit at the top of the precedence
ladder: a ruling beats every section. Full text and reasoning: `DESIGN.md` → *Rulings on
contested points*.

| # | Ruling |
|---|---|
| R1 | Banners are **pale tinted cards**, never the saturated split-strip. |
| R2 | Save is **the same primary as every other primary** — near-black `--ev-ink` since D7, never green, never white-on-white. (D7 amends R2 by one colour name only; the rule is that Save is not special.) |
| R3 | **Rewritten by D7.** Primary action is **near-black `--ev-ink`**, not brand blue — `DECISIONS.md` D7 voids deviation D-1. Links still take **`--ev-blue-dk` + underline**, now because `--ev-blue` is 4.574 : 1 on white and cannot carry 13px text on a tinted ground. A blue primary is a **defect**, not a legacy. |
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
| R15 | Badges, toasts and avatars are **rounded rectangles** — never stadium pills. **Badge radius 4px, toast radius 8px** (`design/07-rulings-r4.md` §12.2). Avatars: **32px circle** for a person, **8px rounded square** for a non-person identity. `rounded-full` elsewhere only where the shape is the mechanism — a switch track and thumb, a segmented control's track and pill, a progress or meter track. |
| R16 | All four banner tones are pale tinted cards. The "info banners carry no fill" MUST is void. |
| R17 | **One warning tone.** Separate "waiting on them" from "waiting on you" with the label, not a second fill. |
| R18 | §1.6 governs transitions only. An ambient loop is licensed **only** for "this feed is live": opacity-only, 1200–2500ms, never below 0.4 opacity, and it may **never encode severity**. |
| R19 | An unchecked checkbox/radio boundary must reach 3:1. §7 beats §6.4's “no new colour”: **`--ev-hairline-strong`** is licensed for resting control boundaries **only**. |

## Using them

Cite the number. "This is R9" ends an argument; "the toast feels long" does not.

If you hit a collision the ladder does not settle, that is a defect in `DESIGN.md` —
report it, do not improvise a twentieth ruling in a code review.
