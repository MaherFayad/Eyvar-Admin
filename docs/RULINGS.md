# Rulings index

The one place that says which rule wins. This file holds links and one-line summaries;
the text of a ruling lives where the link points. If a rule is not reachable from here it
does not bind anyone.

## Precedence

1. **Standing owner overrides** (below).
2. **Decisions** in [`05-restructure/DECISIONS.md`](05-restructure/DECISIONS.md), newest first.
3. **`DESIGN.md` Rulings table** R1–R19 (text in [`06-design-reference/_partials/00-header.md`](06-design-reference/_partials/00-header.md)).
4. **`DESIGN.md` §6.2 sanctioned deviations** D-1 onward (text in [`_partials/06-eyvar-mapping.md`](06-design-reference/_partials/06-eyvar-mapping.md); D-11a onward are appended in DECISIONS.md).
5. **`DESIGN.md` §7–§9** (accessibility, Eyvar patterns, RTL).
6. **`DESIGN.md` §1–§5**, the inherited baseline chapters. They do not describe Eyvar
   directly. Never cite a pixel figure from them (R13).

Round rulings (R-n, R4-n, R5-n) sit at level 2: they were delegated decisions and bind until a
later decision supersedes them.

## ID namespaces

The same digits mean different things with different prefixes. Write the exact form.

| Form | Means | Text lives in |
|---|---|---|
| `R1`…`R19`, `R5a` | `DESIGN.md` ruling | `_partials/00-header.md`, "Rulings on contested points" |
| `D1`…`D34`, `D1a`, `D7a` | Project decision | `05-restructure/DECISIONS.md` |
| `D-1`…`D-13` (hyphen) | `DESIGN.md` §6.2 sanctioned deviation | `_partials/06-eyvar-mapping.md`; D-11a, D-12, D-13 in DECISIONS.md |
| `D3`, `D11` written next to "§6.3" | Legacy defect number | `_partials/06-eyvar-mapping.md` §6.3 |
| `R-1`…`R-4` | Round 3 ruling | `05-restructure/design/00-decisions-r3.md` |
| `R4-1`…`R4-11` | Round 4 ruling | `05-restructure/design/07-rulings-r4.md` |
| `R5-1`…`R5-14` | Round 5 ruling | `05-restructure/design/09-rulings-r5.md` and DECISIONS.md "D16 – D23 — the eight delegated rulings" |
| `AC-nnn` | Acceptance criterion | `05-restructure/specs/` |
| `Q-n`, `V-n`, `B-n`, `F-n`, `W4-Fn` | Audit question or finding | the round document that raised it |

`D7` is the visual-language decision. The §6.2 deviation with the same digit is `D-7`.

## Standing owner overrides

### The report-builder and metric-board specs outrank `DESIGN.md` on those screens (2026-09-04)

The owner ruled that the report builder and the metric boards follow their own specs to the
letter — [`05-restructure/specs/06-report-builder.md`](05-restructure/specs/06-report-builder.md)
and [`05-restructure/specs/05-metrics-content.md`](05-restructure/specs/05-metrics-content.md) —
and that spec fidelity outranks `DESIGN.md` there where the two conflict.
Where a `DESIGN.md` rule is overridden this way, record the override in a comment at the
rule's own site and add it to the list below. Overridden so far:

- `globals.css` "there is no categorical chart palette": `--chart-s1`…`s6` and `--chart-fill-s1`…`s6` exist; `--chart-s1` is `--ev-brand`, so single-series charts are unchanged.
- §3.7 "no gridlines beyond the axis baseline": `SeriesChart` draws horizontal gridlines.
- §5.7 "helper text under fields, not tooltips": rail descriptions are `InfoHint` tooltips.

Not overridden, and not to be assumed overridden: R7's "comparison differs by dash, never by
hue", and `pairRefusal`'s rule for what may share one y-axis.

### A surface recesses, and nothing casts a shadow (2026-09-06)

The owner ruled on how layers stack. **D33 — a surface is recessed.** A card, container,
table or popover is DARKER than the page it sits on, in both themes. Nothing is ever raised
above the page. In light the page stays white and a card reads as a grey panel on it. In dark
the page keeps its value and a card sits below it. Both page values are pinned: `#ffffff` in
light and `#14181e` in dark. Only the surfaces on them move.

**D33a — a surface that COVERS the page is not a surface that sits ON it.** A modal sheet,
dialog or the command palette replaces the page rather than resting on it, and its ground is
the scrim, not the canvas. In light those stay white or near it: darkening the thing the
operator was sent to look at, until it is duller than the page behind it, is backwards. In
dark they still recess, because there a darker panel against a dark scrim reads as the
focused object. Cards, containers and tables sit ON the page and recess in both themes.

**D33b — the light recess is a whisper, and the ceilings are numbers.** A card is at most
1.03:1 below the page; a tint inside a card at most 1.02:1 below the card; the badge plate
takes the tint's ceiling. Steps stack, and it is the stacking that reads as heavy: a grey
header on a grey card on a white page is three tones where the design wants one surface with
a quiet edge.

**D33c — in dark, a tint inside a card steps UP, and that is deliberate (owner, 2026-09-06).**
The dark page is pinned and the whole band from it to black measures 1.179:1, so there is not
enough room for the card, its tints and the covering tier to all recess. The owner chose the
strongest possible card over a correct tint direction: the card takes 1.113:1 of the band and
the covering tier the rest, which leaves `--ev-bg2` lighter than `--ev-surface`. **This is not
a defect and must not be "fixed".** The alternative on offer was card 1.100 / tint 1.041 /
overlay 1.072, and it was declined.

**D34 — no shadows and no glows.** The three shadow tiers are deleted and no surface carries a
drop shadow, an inset highlight or a glow. Separation is the value step plus a hairline,
nothing else. A dark card therefore keeps a real hairline edge, because the inset highlight
that used to draw it is gone. The modal scrim survives: a scrim is what makes a modal modal,
and it is not a shadow. A focus ring survives: a ring is not a shadow.

AC-CC-01 keeps its magnitude and loses its direction: a dark card is that far *below* its
ground, not above. The 1.25:1 figure is not reachable downward from a pinned page, so the
criterion is met at 1.113:1, the largest step the theme can physically produce.

### Onboarding may welcome once and may float its progress (2026-09-05)

The owner asked for a welcome on first arrival, a floating progress indicator, and pictures in
the checklist. Three `DESIGN.md` positions yield, and only this far:

- §5.6 "MUST NOT use modal wizards for onboarding": **one** modal welcome of at most five slides, shown
  once per account on the first session and never again (`WelcomeDialog`, stamped by
  `autoOpenedAt`). Closing it by any route counts as seen. No other wizard, tour, coach mark or
  spotlight is licensed by this.
- R10 "one event, one surface": the checklist has **two** standing surfaces, the account-menu
  entry and the bottom inline-end beacon (`OnboardingBeacon`), while the track is incomplete
  and undismissed. The beacon hides per session and never raises a toast or a banner.
- R8 "an illustration appears only on a whole-page, zero-records-ever empty state": a guide's
  intro card, its expanded task and its completed state may carry a **decorative**
  illustration. Empty states are unchanged; `track-empty` and E1 still carry none.

- §5.6's guide anatomy and spec AC-633/AC-634 (skip a step, `Skipped (n)`): **withdrawn**. A
  step is done or not done; there is no Skip control and no skipped group. The data layer keeps
  the fields; the UI never writes them.

Text: [`design/08-auth-and-onboarding.md`](05-restructure/design/08-auth-and-onboarding.md) §10.6–§10.7.

### The command palette is a centred modal (2026-09-05)

The owner asked for ⌘K to open *"a command palette … centred in the page"* rather than the
anchored dropdown it was. Two positions yield, and only for this one surface:

- **§2.6** specifies global search as an anchored popover and says in so many
  words *"not a centred command palette"*: **overridden**. The palette is a `Dialog`,
  horizontally centred, 640px wide, its top edge fixed at 16vh so the list grows downward
  and the panel never jumps. Every other popover in the product is unchanged, and the
  combobox built on the same `cmdk` primitive is unchanged.
- **CQ-1** (`design/05-command-centre.md`) re-affirmed §2.6 after the confirm step was
  designed: **superseded**, for the reason §2.6 is. The 8-row cap it imposed goes with it;
  the panel now caps at 60vh and the list scrolls inside.

**R4-3 is not touched.** The shell still has four layers. The palette is a modal *like
re-authentication* — it sits above them, it never writes the URL, and AC-22 (one layer at a
time) is unaffected. §7.3.3's "a popover does not trap focus" stops applying here because
there is no longer a popover; the Dialog focus rules apply instead, and closing returns
focus to the trigger.

Consequences recorded at their own sites: `ui/dialog.tsx` grows a fourth size, `palette`,
which is not a size a screen may choose (G6's three widths are otherwise untouched);
`--ev-palette-top` and `--ev-palette-max-h` are the two new tokens, because Tailwind's
spacing scale carries no viewport unit.

Text: [`design/05-command-centre.md`](05-restructure/design/05-command-centre.md) §7–§13.

## `DESIGN.md` rulings

| ID | Ruling in one line |
|---|---|
| R1 | Banners are soft tinted cards everywhere. |
| R2 | Save uses the same primary as every other primary; under D7a that is `--ev-brand`. |
| R3 | The primary action is `--ev-brand` green; links are `--ev-blue-dk` with an underline (rewritten by D7, recoloured by D7a). |
| R4 | Numeric, currency and count columns right-align with tabular figures; this does not flip in Arabic. |
| R5 | No red badge for lifecycle state; critical page-level state is a banner. |
| R5a | The four permitted uses of red: a destructive button, one page-level banner, a breached-row edge marker, a map marker. |
| R6 | Sentences take a period; fragments, labels and buttons do not. |
| R7 | Five badge tones: success, warning, info, neutral, new. There is no critical tone. |
| R8 | An illustration appears only on a whole-page, zero-records-ever empty state. |
| R9 | A toast names the object exactly, one line, 60 characters; truncate the name, never the verb. |
| R10 | One event, one surface: transient confirmation is a toast, a standing condition is a banner, never two banners. |
| R11 | Spent under D7 (it reconciled two inherited nav widths); kept so citations resolve. |
| R12 | §1.6 motion is SHOULD only; the binding motion rules are §7.6 and §8.1. |
| R13 | Every px figure in §1–§5 is indicative, never binding; only figures re-measured against the token layer stand. |
| R14 | `Paid` is the success tone; the same label always takes the same tone. |
| R15 | Badges and toasts are rounded rectangles (4px badge, 8px card and control); avatars are 32px circles (D7). |
| R16 | All four banner tones are pale tinted cards. |
| R17 | One warning tone; separate "waiting on them" from "waiting on you" by label, not fill. |
| R18 | Ambient loops only to signal a live feed: opacity-only, 1200–2500ms, never below 0.4 opacity, never severity. |
| R19 | `--ev-hairline-strong` is licensed only for the resting boundary of an unchecked control. |

## Decisions

One line each. The text lives in `05-restructure/DECISIONS.md`; grep the ID.

| Heading |
|---|
| D1 — Information architecture: 5 workspaces, 34 sub-tabs |
| D1a — Amendment to D1: 35 sub-tabs. Management gains **Reports** at order 6 |
| D2 — Minimum viewport: 1280px |
| D3 — Stack |
| D4 — Role model — **OPEN, needed before 0.7** |
| D5 — The sub-tab column never collapses |
| D6 — The navigation has its own background, one step darker than the canvas |
| D7 — the **visual** language is the token layer: colour, spacing, radii, type, table style |
| D7a — the primary action is brand green, not near-black; amends R2 and R3 by one colour name and no behaviour |
| D8 — A row kebab is for *many* actions, never for one or two |
| D9 — ⌘K is a command centre, not a search box |
| D10 — Two rulings from the owner on chrome, applied immediately |
| D11 — The index toolbar is TWO rows, and search is a field |
| D12 — The view switcher is a STADIUM segmented control, and R15 gets one narrow exception |
| D13 — the ad-hoc **Report Builder** is a semantic layer before it is a screen |
| D14 — the auth spec governs auth STRUCTURE; D7's visual language governs its look |
| D15 – D30 — text in `DECISIONS.md`; D16 – D23 are the eight delegated round-5 rulings |
| D31 — what Admin does not do: no city scoping, no impersonation, no bulk invite |
| D32 — the five Management rules (O1, O8, O9, O10, O11) |
| D33 — a surface RECESSES: a card, container or table is darker than the page it sits on, in both themes |
| D33a — a surface that COVERS the page (sheet, dialog, palette) stays white in light and recesses only in dark |
| D33b — the light recess is a whisper: a card ≤1.03:1 under the page, a tint ≤1.02:1 under the card |
| D33c — in dark the in-card tint steps UP, deliberately: the band below the pinned page is too narrow for both |
| D34 — no shadows and no glows; a surface is separated from its ground by the value step and a hairline, nothing else |
| D-11a — who owns focus when a menu hands off to a layer: **the layer wins** |
| D-12 — peek is the drawer, not a sixth surface |
| D-13 — motion has no duration tokens, and the request for a duration scale is refused |

## Round rulings

Round 3, [`design/00-decisions-r3.md`](05-restructure/design/00-decisions-r3.md):

| Heading |
|---|
| 1. R-3 — the shadow scale |
| 2. R-1 — shadcn `empty`: **upheld. Do not add. `components.json` stays frozen.** |
| 3. F-9 — six vs seven: **seven. §18's prose was wrong; §1.2's table is normative.** |
| 4. Q12 — badge-tone roll-up: **0.6's escalation confirmed, with one clause added.** |

Round 4, [`design/07-rulings-r4.md`](05-restructure/design/07-rulings-r4.md):

| Heading |
|---|
| 1. R4-1 · Q-RB-4 — the series palette. **Small multiples. Do not mint the palette.** |
| 2. R4-2 · Three §6.4 rows, and one new page shape |
| 3. R4-3 · The shell has **four** layers, not five. Re-authentication is a modal. |
| 4. R4-4 · The `MetricBoard` contract — breakdowns, captions, notices |
| 5. R4-5 · W4-F2 — the delta chip is **neutral**. §3.7's colour MUST is void. |
| 6. R4-6 · W4-F1 — Market & Zones is **both**, and the table is primary |
| 7. R4-7 · R15, the stadium, and the avatar |
| 8. R4-8 · The elevation gap. **Real. Tier 0.5, and today's build is the interim.** |
| 9. R4-9 · D-11 — who owns focus when a popover hands off to a layer |
| 10. R4-10 · Severity resolution, and the nav `attention` cap |
| 11. R4-11 · Q-114 — the bar a board must clear, applied to Performance |

Round 5, [`design/09-rulings-r5.md`](05-restructure/design/09-rulings-r5.md):

| Heading |
|---|
| 1. R5-1 · V-2 — the unexplained em dash |
| 2. R5-2 · AC-605's hole |
| 3. R5-3 · The declaration-order clause is deleted, and it was mine |
| 4. R5-4 · B-3 — the caption's scope was drawn wrong |
| 5. R5-5 · B-1 — two numeric columns, and the slot that should not exist |
| 6. R5-6 · B-2 / V-11 — the bar earns its place; the token does not |
| 7. R5-7 · B-8 — `MetricBreakdownRow.labelKey` gains a union |
| 8. R5-8 · V-3 — a breakdown never exceeds half the content width |
| 19. R5-11 completed — the field it needed, and two measured results |
| 20. R5-9 corrected — §18.1's guard was written the way §4.2 was, and that is the whole objection |
| 21. Three boards fail R5-10, not two — and `avgRenewalRate` is a label problem before it is a caption one |
| 22. The fourth population — and R5-14, which is what stops there being a fifth |
| 24. R5-10 was over-specified — the `mod 4` clause never binds |

A grep is a lead and never a finding: a claim binds only once someone has opened the file
and read the line. `CLAUDE.md` states the rule; it is here because it decides which of two
contradicting sources wins, and the answer is always the one that was read.

## Adding a ruling

Append it to `05-restructure/DECISIONS.md` with the next `D` number and the date, then add
one row here. A ruling that lives only in a source comment, a chat, or a memory file does
not exist.
