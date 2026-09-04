---
name: new-hook
description: Add a shared React hook or helper to Eyvar Admin's src/hooks or src/lib. Use when the same logic appears across screens, when a DESIGN.md rule needs enforcing centrally (money, dates, focus, RTL), or when consolidating duplication. Includes the three-call-site test and edge-case coverage.
---

# Add a shared hook or helper

## 1. Earn it

A utility belongs in the shared layer when it has **three real call sites**, or **one call
site plus a `DESIGN.md` rule that must be enforced centrally**. Two similar-looking screens
are not a pattern.

Before writing anything, grep for what already exists:

```bash
rg -n "export (function|const) " src/lib src/hooks
```

Adding a third way to format a date is worse than the duplication you set out to remove.

## 2. Decide where it goes

| It... | Goes in | Or does not belong here |
|---|---|---|
| Holds React state or effects | `src/hooks/` | |
| Is a pure function | `src/lib/` | |
| Is focus trapping, dismiss, portalling | — | shadcn/Radix already do it |
| Is `cn()` | — | ships with shadcn init; never write a second |
| Renders anything | — | frontend-engineer owns components |
| Calls a real endpoint | — | mock-data-engineer owns the seam |
| Encodes a domain rule ("inactive after 30 days") | — | lives with the feature |

## 3. Write it

```ts
/**
 * Formats money for display.
 * DESIGN.md §8.3: integer minor units in, tabular figures out, U+2212 for
 * negatives (never a red pill - R5a), currency position does not mirror in
 * Arabic (§9.2).
 */
export function formatMoney(minorUnits: number, opts?: FormatMoneyOptions): string
```

The comment naming the rule is not decoration. Someone will try to simplify this function
in six months and needs to know why it looks the way it does.

Rules: one job per export; no `any` in a signature; the name says what it returns, not how
it works; no default export.

## 4. Test harder than you would test a screen

Shared code has many callers and no visible owner — a subtle break surfaces as a mysterious
defect three screens away. Cover explicitly:

- Zero, negative, very large
- `null` and `undefined` where the type permits
- Arabic input, and RTL direction where the helper is direction-aware
- Date boundaries: DST, month ends, timezone (`Asia/Riyadh`)
- Empty collections, single-item collections

## 5. Port from the legacy app where the logic exists

`eyvar_ops_panel_v40_fixed.html` has 1,042 functions. Its formatting, sorting and SLA
logic is battle-tested even where it is ugly. Read it, port the behaviour, cite
`file:line` — and note explicitly any bug you are deliberately not carrying across.

## Check

- [ ] Three call sites, or one plus a rule it enforces
- [ ] Nothing equivalent already exists
- [ ] No `any` in the signature
- [ ] Tests cover the edge cases above, not just the happy path
- [ ] Any `DESIGN.md` rule it encodes is cited in a comment
- [ ] It renders nothing and fetches nothing

## Common failures

- **Abstracting at two call sites.** Wait for the third; the shape is usually wrong until
  then, and everyone inherits it.
- **A utility that takes eight options.** That is three utilities wearing a trenchcoat.
- **Leaving the rule uncited.** Then someone "fixes" `formatMoney` to use a float.

## Reference

Check the small file, not the whole document:
`docs/ref/tokens.md` · `docs/ref/a11y.md` · `docs/ref/rtl.md` · `docs/ref/copy.md`

Index: `docs/ref/README.md`. For a section's full text read its partial in
`docs/06-design-reference/_partials/`; which rule wins is `docs/RULINGS.md`.
