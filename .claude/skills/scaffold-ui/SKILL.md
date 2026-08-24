---
name: scaffold-ui
description: Scaffold an Eyvar Admin screen or component in React + TypeScript + CSS Modules with all four states wired from the start. Use when implementing a design spec, adding a component, or starting a new screen. Creates the files, the CSS module, and the test stub.
---

# Scaffold a screen or component

## Before you write a file

Read the design spec, and the `DESIGN.md` sections it cites. If there is no design spec,
stop — ask product-designer. Building from a feature spec alone means inventing design
decisions, which is how the system drifts.

## Component

```
src/components/<Name>/
  <Name>.tsx
  <Name>.module.css
  <Name>.test.tsx
  index.ts
```

```tsx
// <Name>.tsx
import styles from './<Name>.module.css'

export interface <Name>Props {
  /* typed, no `any` */
}

export function <Name>({ ... }: <Name>Props) {
  return <div className={styles.root}>...</div>
}
```

```css
/* <Name>.module.css - every value is a token. No literals. */
.root {
  padding: var(--space-3);
  border-radius: var(--radius-card);
  background: var(--white);
  border: 1px solid var(--border);
}
```

If a token you need does not exist, add it to `src/styles/tokens.css` **in the same
commit** and say so in the handoff. Do not inline the value "for now".

## Screen

```
src/screens/<Module>/<Screen>.tsx
```

Build the states in this order. Writing them in this order is the point — it makes
omitting one visible:

```tsx
export function <Screen>() {
  const { data, status, error, retry } = useAsync(() => getResource(params))

  if (status === 'loading') return <ScreenSkeleton />
  if (status === 'error')   return <ErrorState error={error} onRetry={retry} />
  if (!data.length)         return <EmptyState {...copyFromDesignSpec} />

  return <>{/* content */}</>
}
```

Data comes from `src/data/clients/` — never import a fixture directly. Shared behaviour
(pagination, filters, selection, formatting) comes from `src/hooks/` and `src/lib/` — if
it doesn't exist, ask utilities-engineer rather than writing a private copy.

## Non-negotiables

Check each before you call it done:

- [ ] No literal colour, radius, spacing, font-size or duration in the CSS module
- [ ] All four states present and reachable
- [ ] Logical properties only — `margin-inline-start`, never `margin-left` (§9.1)
- [ ] Interactive elements are `<button>` / `<a>`, never a `<div onClick>` (§7.4)
- [ ] No `outline: none` without a replacement focus ring (§7.2)
- [ ] Hover-revealed actions also appear on `:focus-within` (§7.3)
- [ ] One primary button, in `--blue` (R3)
- [ ] Red used only where R5a permits
- [ ] Copy matches the design spec exactly — no improvised strings

Then run `/token-audit` on the files you touched.

## Common failures

- **Shipping the happy path and calling it done.** The other three states are the job.
- **Inlining a value because the token doesn't exist yet.** It never gets cleaned up. Add
  the token.
- **Copying a component from the legacy HTML.** Port the *behaviour*, cite the line, but
  the markup and CSS are rebuilt to `DESIGN.md` — the legacy file carries 24 documented
  defects and you do not want to inherit them.

## Reference

Check the small file, not the 5,692-line document:
`docs/ref/tokens.md` · `docs/ref/states.md` · `docs/ref/a11y.md` · `docs/ref/rtl.md`

Index: `docs/ref/README.md`. Open a `DESIGN.md` section only for the
reasoning or the evidence behind a rule.
