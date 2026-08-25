---
name: visual-audit
description: Audit a built Eyvar Admin screen against DESIGN.md in five passes - token conformance, rule conformance, reference comparison, accessibility, and Arabic. Use before merge, when a design regression is suspected, or when checking RTL rendering. Produces docs/02-verification/<module>-<feature>-visual.md.
---

# Visual audit

Five passes. Run all five; each catches a different class of defect.

## Pass 1 — Token conformance (mechanical, do it first)

Run `/token-audit`. This pass is a script, not an opinion, and it finds more real defects
than the other four combined.

Under Tailwind the top defect is **`bg-blue-500`** — a palette class that is not an Eyvar
token and reads as perfectly legitimate. Then, in order of frequency:

- arbitrary values — `p-[13px]`, `text-[#185FA5]`
- raw hex or `oklch()` outside `src/styles/globals.css`
- physical direction utilities — `ml-*`, `left-*`, `text-left`, `border-l`
- `outline-none` with no paired `focus-visible:ring-*`
- inline `style={{}}` on anything not genuinely dynamic
- any file under `src/components/ui/` still carrying stock shadcn greys, which means it
  was added by the CLI and never restyled

Also confirm `components.json` still has `"rtl": true`. If it was ever off, every
component added since is suspect and needs re-checking.

## Pass 2 — Rule conformance

Walk the **Ship checklist** in the `DESIGN.md` front matter against the built screen. Cite
the rule number for every finding.

The ones most often broken: four states present · one primary button in blue (R3) · badge
tones from the five-tone palette, no red pill (R5a, R7) · banners as pale tinted cards,
never two at once (R1, R10) · toast one line naming its object (R9) · empty-state
illustration only when whole-page and zero-records-ever (R8).

## Pass 3 — Reference comparison

Capture the screen with Playwright, then open the equivalent Shopify screenshot from
`docs/06-design-reference/shopify-admin-web/` and compare side by side.

You are **not** looking for a pixel match — Eyvar is denser by sanctioned deviation D-2.
You are looking for structural divergence: actions in the wrong place, a page header
missing its status badge, a card hierarchy that reads inside-out, a toolbar that put
filters where views belong. Cite both files.

## Pass 4 — Accessibility (§7)

- Compute contrast ratios; do not eyeball them. `--ghost` on white is 2.79:1 and fails —
  flag every use for text.
- Tab the whole screen: visible focus ring on every interactive element (§7.2).
- Row actions reachable without a mouse (§7.3).
- Colour is never the only carrier of meaning (§7.5).

## Pass 5 — Arabic (§9)

Load with `dir="rtl"` and capture. Layout mirrors; digits, currency and the map do not
(§9.2). Look for physical-direction leakage — an icon on the wrong side, a collapsed badge
margin, a toast sliding in from the wrong edge. This pass catches what no English capture
can.

## Report

```markdown
# <Feature> — visual verdict
**Design spec:** <link> · **Commit:** <sha> · **Passes run:** 1-5

## Findings
| Severity | Rule | Observed | Evidence | Suggested fix |

## Ship checklist
| Item | Result | Note |

## Verdict
<May merge / must not merge, and why.>
```

## Check

- [ ] All five passes actually run — a pass that could not run is marked not run, never
      assumed clean
- [ ] Every finding cites a rule number and evidence
- [ ] Preferences are labelled as suggestions, not defects — if `DESIGN.md` does not
      forbid it, it is not a violation
- [ ] Nothing was fixed by you; findings go back to frontend-engineer
- [ ] A clean screen gets a clean report — no manufactured findings

## Common failures

- **Opinion dressed as a rule.** Your authority comes from the document. Spending it on
  taste devalues it.
- **Skipping pass 5.** Arabic defects reach production precisely because nobody looked.
- **Waiving a rule to unblock a merge.** If a rule is genuinely wrong, that is a finding
  against `DESIGN.md`, raised separately — never waived in place.

## Reference

Check the small file, not the 5,761-line document:
`docs/ref/rulings.md` · `docs/ref/tokens.md` · `docs/ref/components.md` · `docs/ref/a11y.md` · `docs/ref/rtl.md` · `docs/ref/screenshots.md`

Index: `docs/ref/README.md`. Open a `DESIGN.md` section only for the
reasoning or the evidence behind a rule.
