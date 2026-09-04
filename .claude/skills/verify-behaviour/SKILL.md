---
name: verify-behaviour
description: Test an Eyvar Admin feature against its acceptance criteria with Vitest and Testing Library, then write the QA verdict. Use after a screen is built, when criteria need verifying, or when a bug needs a reproducing test. Produces docs/02-verification/<module>-<feature>-qa.md.
---

# Verify behaviour against the spec

## 1. Load the criteria

Read `docs/05-restructure/specs/<module>-<feature>.md` — the acceptance criteria and the
state table — and the design spec's interaction and keyboard sections.

If a criterion cannot be passed or failed as written, that is a spec defect. Record it and
raise it to product-owner; do not guess what it meant.

## 2. One test per criterion, named after it

```tsx
// AC-4: A driver with no completed trips in 30 days shows the `Inactive` badge
// and is excluded from the default view.
it('AC-4: excludes drivers inactive for 30 days from the default view', async () => {
  render(<DriversScreen />)
  expect(await screen.findByRole('row', { name: /Layla/ })).toBeInTheDocument()
  expect(screen.queryByRole('row', { name: /Dormant Dan/ })).not.toBeInTheDocument()
})
```

Query by role, label and text — the way an operator perceives the screen. If you need a
test id because nothing is queryable, that is usually an accessibility defect in the
component: record it rather than working around it silently.

## 3. Cover the four states, always

Drive them through the mock client's injectable failure and latency:

```tsx
it('renders the error state and recovers on retry', async () => {
  mockFailure.set('getDrivers', true)
  render(<DriversScreen />)
  expect(await screen.findByRole('alert')).toHaveTextContent(/couldn.t load/i)
  mockFailure.set('getDrivers', false)
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
  expect(await screen.findByRole('table')).toBeInTheDocument()
})
```

Then the domain states the spec names — a claimed fraud case, a reconciling wallet, a
driver mid-trip. That is where the real defects are.

## 4. Cover the keyboard

Tab reaches every action · Escape closes the modal · Enter submits · focus returns to the
trigger on close · row actions are reachable without a mouse (§7.3).

## 5. Run it, then write the verdict

Run the suite. A verdict written from reading code is not a verdict.

```markdown
# <Feature> — QA verdict
**Spec:** <link> · **Commit:** <sha> · **Suite:** <n> passed, <n> failed

## Criteria
| # | Criterion | Result | Test |
|---|---|---|---|

## Defects
| Severity | What breaks | Steps | Expected | Actual |

## Coverage gaps
| What | Why not tested |

## Spec defects
| Criterion | Problem |
```

## Check

- [ ] Every criterion has a test, or a documented reason it cannot
- [ ] All four base states tested, plus every domain state
- [ ] Keyboard paths tested
- [ ] No assertions on internal state, hook calls, or render counts
- [ ] The suite was actually run and the verdict states the real result
- [ ] Nothing was fixed by you — defects are reported, not repaired

## Common failures

- **Softening a result.** A failing suite is reported as failing, with the output. Never
  describe a skipped test as passing.
- **Testing implementation.** If a no-op refactor breaks the test, the test was wrong.
- **Fixing what you found.** It destroys the independence that makes the report worth
  reading.

## Reference

Check the small file, not the whole document:
`docs/ref/states.md` · `docs/ref/surfaces.md` · `docs/ref/copy.md`

Index: `docs/ref/README.md`. For a section's full text read its partial in
`docs/06-design-reference/_partials/`; which rule wins is `docs/RULINGS.md`.
