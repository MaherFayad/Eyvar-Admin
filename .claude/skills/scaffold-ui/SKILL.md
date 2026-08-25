---
name: scaffold-ui
description: Scaffold an Eyvar Admin screen or component with shadcn/ui, React and TypeScript, with all four states wired from the start. Use when implementing a design spec, adding a component, or starting a new screen. Adds the shadcn primitive, restyles it to DESIGN.md, and creates the test stub.
---

# Scaffold a screen or component

## Before you write a file

Read the design spec and the `DESIGN.md` sections it cites. No design spec → stop and ask
product-designer. Building from a feature spec alone means inventing design decisions.

Then check `docs/ref/components.md` — the shadcn primitive for your pattern is probably
already mapped, and if the answer is "none — build it" you need to know that now.

## Adding a primitive

```bash
pnpm dlx shadcn@latest add button badge dialog
```

Never hand-write a component the CLI can add. `components.json` must have `"rtl": true`
so physical classes are converted to logical ones on the way in — that is how §9.1 is
enforced mechanically. Check it before adding anything.

**A freshly added component is not Eyvar-compliant.** Restyle it immediately:

1. Strip Tailwind palette classes (`bg-slate-100`, `text-gray-500`) → semantic slots
   (`bg-muted`, `text-muted-foreground`).
2. Strip arbitrary values.
3. Apply the rule for that component — geometry (R15), tone set (R7), copy (§5.7).
4. Confirm the focus ring survives (§7.2).
5. Note the rules you applied in a comment at the top of the file.

## Screen

```
src/screens/<Module>/<Screen>.tsx
```

Build the states in this order. Writing them in order is the point — it makes omitting one
visible:

```tsx
export function <Screen>() {
  const { data, status, error, retry } = useAsync(() => getResource(params))

  if (status === 'loading') return <ScreenSkeleton />
  if (status === 'error')   return <ErrorState error={error} onRetry={retry} />
  if (!data.length)         return <EmptyState {...copyFromDesignSpec} />

  return <>{/* content */}</>
}
```

Data comes from `src/data/clients/` — never import a fixture directly. Shared hooks and
formatters come from `src/hooks/` and `src/lib/`; if one doesn't exist, ask
utilities-engineer rather than writing a private copy that will drift.

## Non-negotiables

- [ ] No Tailwind palette classes — `bg-blue-500` is not a token
- [ ] No arbitrary values — `p-[13px]`, `text-[#185FA5]`
- [ ] All four states present and reachable
- [ ] Logical utilities only — `ms-`/`me-`/`ps-`/`pe-`/`start-`/`end-`/`text-start`
- [ ] Interactive elements are `<button>`/`<a>`, never `<div onClick>` (§7.4)
- [ ] `outline-none` always paired with `focus-visible:ring-*` (§7.2)
- [ ] Hover-revealed actions also appear on `focus-within:` (§7.3)
- [ ] One primary button, `bg-primary` (R3); red only where R5a permits
- [ ] Copy matches the design spec exactly — no improvised strings

Then run `/token-audit` on what you touched.

## Common failures

- **Shipping the happy path.** The other three states are the job.
- **Using a shadcn component as it arrived.** It comes with someone else's greys. Restyle
  on arrival or the drift is permanent.
- **`text-gray-500` because it looked right.** It is not a token, it passes casual review,
  and it is the single most common way Tailwind projects lose their design system.
- **Copying markup from the legacy HTML.** Port the *behaviour*, cite the line — the file
  carries 24 documented defects you do not want to inherit.

## Reference

Check the small file, not the 5,761-line document:
`docs/ref/components.md` · `docs/ref/tokens.md` · `docs/ref/states.md` · `docs/ref/a11y.md` · `docs/ref/rtl.md`

Index: `docs/ref/README.md`. Open a `DESIGN.md` section only for the
reasoning or the evidence behind a rule.
