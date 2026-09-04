---
name: design-screen
description: Turn a feature spec into a design spec for an Eyvar Admin screen, grounded in DESIGN.md, the Navattic visual reference and the Shopify structural reference. Use when a spec is ready to be designed, when choosing a pattern, or when specifying states and UI copy. Produces docs/05-restructure/design/<module>-<feature>.md.
---

# Design a screen

## 1. Load the rules that apply

1. The feature spec: `docs/05-restructure/specs/<module>-<feature>.md`
2. `DESIGN.md` — the cheat sheet, the **Precedence ladder**, the **Rulings table**, and
   every section the §6.4 pattern row cites

The precedence ladder matters more than anything else here: a MUST in §1–§5 describes
Shopify, not Eyvar. What binds is Rulings → §6.2 deviations → §7–§9 → §1–§5.

## 2. Look at the reference

Open the Navattic frames in `docs/06-design-reference/navattic-web/` for the visual
language (D7), then 3–5 Shopify screenshots of the equivalent structural pattern from
`docs/06-design-reference/shopify-admin-web/`. They are `.webp`; the Read tool renders
them. Ignore the watermark strip at the bottom.

| Building | Look in |
|---|---|
| Index / list | `03-products/`, `02-orders/`, `04-customers/` |
| Detail + timeline | `02-orders/order-detail-*`, `04-customers/customer-detail-*` |
| Sectioned form | `09-discounts/discount-create-*`, `04-customers/customer-new-form-*` |
| Settings pane | `10-settings/` |
| Metrics / charts | `07-analytics/` |
| Empty states | `04-customers/customers-empty-state`, `09-discounts/discounts-empty-state` |
| Modals, toasts, banners | any `*-modal`, `*-toast`, `*-banner` file |

Cite the files you opened. Design from evidence.

## 3. Write

Create `docs/05-restructure/design/<module>-<feature>.md`:

```markdown
# <Feature> — design

**Spec:** <link> · **Pattern:** DESIGN.md §6.4 → <row> · **Governed by:** §<n>, §<n>
**Reference examined:** <screenshot paths>

## Layout
<ASCII wireframe. Name the page shape: single column | main + rail |
full-bleed editor | monitoring shell.>

## Page header
Title · status badge · pager · actions (primary last)

## Regions
| Region | Contains | Card? | Notes |

## States
### Content / Empty / Loading / Error / <domain states>
<For each: what renders, exact copy, which components.>

## Components
| Component | Variant | Tone | Rule |

## Copy
| Element | String | Rule |

## Interaction
| Trigger | Result | Surface (modal/drawer/page — §5.0) | Confirm? |

## Keyboard
| Key | Behaviour |

## Arabic (§9)
<What mirrors, what does not. Any string that needs rewording.>

## Deviations
| What | Rule suspended | Why |
```

## 4. Check before handing off

- [ ] Every state from the spec is drawn — including all four base states
- [ ] Every string is final; no `TODO: copy`
- [ ] Badge tones come from the five-tone palette (R7); no red badge (R5a)
- [ ] One primary button, in brand blue (R3)
- [ ] Toasts: one line, object named exactly, ≤60 chars (R9)
- [ ] Banner vs toast decided by lifetime (R10); never two page-level banners
- [ ] Empty state: illustration only if whole-page and zero-records-ever (R8)
- [ ] No layout rule stated as left/right — use inline-start/inline-end (§9.1)
- [ ] Every deviation names the rule it suspends
- [ ] No §1–§5 pixel figure quoted as binding (R13)

## Common failures

- **Designing from memory of admin panels** instead of opening the reference.
- **Drifting toward Shopify's spacing.** Eyvar is dense by sanctioned deviation D-2. Keep
  it dense, keep it on the 4px grid.
- **Leaving the error state to the engineer.** They will invent one, and it will be
  "Something went wrong."

## Reference

Check the small file, not the whole document:
`docs/ref/rulings.md` · `docs/ref/patterns.md` · `docs/ref/components.md` · `docs/ref/surfaces.md` · `docs/ref/states.md` · `docs/ref/copy.md` · `docs/ref/screenshots.md` · `docs/ref/rtl.md`

Index: `docs/ref/README.md`. For a section's full text read its partial in
`docs/06-design-reference/_partials/`; which rule wins is `docs/RULINGS.md`.
