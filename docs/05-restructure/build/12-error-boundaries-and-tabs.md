# 12 — Error boundaries, and the `aria-controls` that dangled

Two independent defects from `17-reconciled-findings.md` §1: **P1-8** (no error boundary
anywhere) and **P1-6** (`aria-controls` dangles on every index screen, axe *critical*).
This is the contract for both, for QA and visual QA.

---

## P1-8 — the boundaries

`src/components/ErrorBoundary.tsx` is new. It is a class component (nothing else can catch
a render throw), it holds no design language of its own, and its fallback **is
`ErrorState`** — the same card, heading, body, `Try again` and grey sentence that every
failed *read* already renders. An operator should not be able to tell from the shape of
the surface whether the network failed or the code did, because the move they make next
is identical.

### Where it is mounted

| Level | Site | What survives a throw |
|---|---|---|
| **Route** | `src/shell/AppLayout.tsx`, around `<Outlet />`, **inside `<main>`** | Rail, sub-tab column, top bar, search, notification bell, account menu — all mounted and interactive. Verified in the browser: after a screen throw, clicking the Finance rail tile navigated to `/financials/overview` and rendered it (**AC-24**, for a crash rather than a failed read) |
| **Panel** | `src/components/metrics/ChartCard.tsx`, around the plot `Body` | The card keeps its title, its `Computed …` line and its report link. Verified: 12 metric tiles, the banner and the queue card all still rendered while one chart card's body was the error state |
| **Panel** | `src/components/reports/ResultCanvas.tsx`, one per `PanelCard` in the small-multiples grid | Five of six panels still readable when the third throws |

There is deliberately **no `row` scope**. A boundary per row would hide the same systematic
defect 25 times on one screen and make it read as a flaky row.

**Not in `App.tsx` and not around `<Routes>`.** A boundary above `AppLayout` takes the rail
down with the screen and leaves nothing to navigate with, which is the failure this exists
to end. `routes.tsx` is untouched (single-owner file, and it is being code-split right now).

### The copy — §5.7, all new keys in `dictionaries.ts`

```
state.crashPage.title          Couldn't display {resource}
state.crashPage.titleGeneric   Couldn't display this page
state.crashPage.body           The rest of the console is still working. Try again, or pick
                               another sub-tab from the list.
state.crashPage.action         Try again
state.crashPage.escape         Go to overview
state.crashCard.message        Couldn't display {resource}. The rest of the page still works.
state.crashCard.messageGeneric Couldn't display this panel. The rest of the page still works.
state.crash.detail             Error detail            (development only)
```

Sentence case, no `Oops`, no `Sorry`, no exclamation mark, no `please`, no `something went
wrong`, no blame. The page body names the way out — **the sub-tab list**, which is exactly
what `state.pageError.body` already points at, and it is true here for the same structural
reason: the boundary is inside `<main>`.

`{resource}` is the route's own title from the route table (`Overview`, `Live Dispatch`) at
page level, and the card's title at panel level. Never a component name.

### Two actions, and where they come from

`Try again` is the primary (R3) and **really remounts**: the reset bumps an `attempt`
counter that is the `key` on the wrapper around `children`, so every hook re-runs and every
`useAsync` refetches. Clearing the error alone would re-render the same failing element and
throw again. `resetKeys` (the location, from `AppLayout`) does the same automatically, so a
crashed screen does not follow the operator to the next route.

`Go to overview` is the ghost secondary, targeting the workspace the operator is still in —
the same target `NotFoundScreen` uses. Never a redirect: the URL of the crash stays in the
bar so the operator can say what they clicked.

**`onEscape` is a callback, not a `{ label, onClick }` pair**, and that is load-bearing.
Building the label at the call site evaluates `t('state.crashPage.escape')` on every render
of a healthy shell, and `createTranslator` throws on a missing key — **observed, not
theorised**: for the minutes the key was missing from `dictionaries.ts` (another agent reset
that file to HEAD and took the keys with it) *every route in the product rendered blank*.
The boundary now resolves its own copy inside the error branch.

### Development vs production

`isDevEnvironment()` gates a `<details>` disclosure carrying `error.message`, and
`componentDidCatch` logs the component stack. In production neither string is built. A
production operator cannot act on `Cannot read properties of undefined`, and the message
can carry record data from the row that threw.

---

## `ApiError.retryable` — the retry that was a lie

`src/components/ErrorState.tsx` now takes an optional `cause?: unknown` on **all three
scopes** and drops the action when `isApiError(cause) && !cause.retryable` — false for 401,
403, 404, 409 and 422. A forbidden read offering `Try again` is a lie told to an operator
under time pressure: they press it, it fails identically, and they press it again.

**The gate is in the component, not at the 78 call sites.** A caller passes the action it
would offer plus the cause; `ErrorState` decides. That keeps the `card` scope's *"an action
is REQUIRED"* type rule intact — a caller still may not forget one — while making the
suppression a system decision. A caller that passes no `cause` behaves exactly as before,
because an unknown failure is retryable by default, which is how `isRetryableStatus` treats
one.

`canRetry(cause)` is exported for the few call sites that choose the shape of the surface
before they reach `ErrorState`.

### Final `ErrorStateProps`

```ts
interface RetryGate { cause?: unknown }            // all three scopes

type ErrorStateProps =
  | { scope: 'page'; heading?: string; message: string; action?: ErrorAction
      secondaryAction?: ErrorAction; detail?: ReactNode; card?: boolean; className?: string; cause?: unknown }
  | { scope: 'card'; message: string; action: ErrorAction                    // still REQUIRED
      detail?: ReactNode; card?: boolean; className?: string; cause?: unknown }
  | { scope: 'row';  message: string; action?: ErrorAction; className?: string; cause?: unknown }
```

`secondaryAction` (page only) is a ghost button beside the primary. `detail` is a
development-only slot rendered last.

### What is NOT done, and who owns it

**`DataTable` cannot pass a cause.** Its prop is
`error: { message: string; onRetry: () => void }` (`DataTable.tsx:301`) — the thrown error
never reaches it, so all 22 index tables still offer `Try again` on a 403. The fix is one
line in a file this owner may not edit:

```ts
error: { message: string; onRetry: () => void; cause?: unknown }   // then forward `cause` to ErrorState at :1077
```

**table-density-engineer / whoever holds `DataTable.tsx`: this is the change.** Every
screen already has the error object in scope (`useAsync` returns `error: Error | null` and
`isApiError` narrows it), so the call sites are a mechanical follow-up once the prop exists.

---

## P1-6 — the `aria-controls` root cause

**One line of Radix.** `Tabs.Trigger` writes
`aria-controls={makeContentId(baseId, value)}` **unconditionally**, whether or not a
`Tabs.Content` with that value was ever rendered
(`node_modules/@radix-ui/react-tabs/dist/index.mjs`, the `Primitive.button` props). Two
independent ways it dangles:

1. **The view switcher.** `IndexToolbar` and `FairnessScreen` use `Tabs` as a switcher over
   a dataset whose body `DataTable` renders as a *sibling*, outside the `Tabs` root. There
   is no `TabsContent` at all, so **every trigger, the selected one included, referenced a
   missing id.** That is the axe *critical*: axe excuses a dangling reference on an
   unselected tab as "needs review", but not on the selected one.
2. A real tab set can dangle too, whenever Radix has not mounted a panel.

### The fix — a panel registry in `src/components/ui/tabs.tsx`, once, centrally

`TabsContent` registers its `value` while mounted (`useLayoutEffect`, so the attribute is
right before paint); `TabsTrigger` emits `aria-controls` **only when a panel with its value
is actually in the DOM**, and otherwise passes `aria-controls={undefined}`, which React
drops — our props are spread after Radix's own inside the primitive, so ours wins. Two
contexts, deliberately: the registrar must be identity-stable or the effect unregisters and
re-registers forever.

**No call site changed and no call site can get it wrong.** `IndexToolbar` was not edited
(it is in `src/components/table/`, another owner's directory this round).

### `role="tab"` stays — a decision, not an omission

`aria-controls` is a *supported* property of `tab`, not a required one, so a tab without one
is valid ARIA; `aria-selected` is required and is present, and it is the state the switcher
actually needs announced (*"Applications, tab, selected, 2 of 4"*). The two alternatives
were weighed and both are worse **under this round's constraints**:

- **Point `aria-controls` at the table body.** Correct, and needs an `id` on the body plus
  the id threaded into `IndexToolbar` — both in `src/components/DataTable.tsx` /
  `src/components/table/`, which this owner may not edit. **This is the better long-term
  answer** and belongs to whoever holds those files.
- **Re-role to `radiogroup`/`radio`.** Loses the "selected, 2 of 4" announcement, needs an
  accessible name on a list that has no string to give it (adding one means editing
  `IndexToolbar`), and rewrites four QA-owned test files that assert `role="tab"`
  (`communications.test.tsx:304`, `pricing.test.tsx:122`, `reports.mode.test.tsx:273`,
  `financials/keyboard.test.tsx:115`). `RevenueScreen.tsx:842`'s `aria-pressed` buttons are
  the same idea and are the precedent if product-designer wants the roles changed.

**For product-designer:** a decision is wanted on which of the three the switcher should
be. The dangling reference is fixed either way.

### Also fixed while in the file

`TabsContent` carried `outline-none` while Radix gives it `tabIndex={0}` — a focusable
panel opting out of the product's default `:focus-visible` outline with nothing put back
(§7.2, D20: components opt into a stronger ring, never out of one). The class is removed.

---

## Verified in the browser

Playwright, Chromium, 1440×900, dev server (`npx vite`; **5199–5201 were already taken by
other agents, so this ran on 5202**).

**`aria-controls`, measured on four screens.** `document.querySelectorAll('[aria-controls]')`
then `document.getElementById(id)` for each:

| Route | `aria-controls` attributes | dangling |
|---|---|---|
| `/operations/people` | 0 | 0 |
| `/operations/trips` | 0 | 0 |
| `/support/tickets` | 0 | 0 |
| `/operations/dispatch` (a real tab set) | 3 | **0** — all three resolve |

Tabs keep `role="tab"` and `aria-selected` on every one.

**Route boundary**, `/operations/overview` with a deliberate throw in a screen component:
`main` present, 2 `<nav>` landmarks, 18 visible links, headings `Operations` and
`Couldn't display Overview`, buttons `Try again` and `Go to overview`. Clicking the
Financials rail link navigated to `/financials/overview` and rendered its `<h1>`. Both
fallback buttons are Tab-reachable and carry the focus ring
(`box-shadow: … 0 0 0 2px #fff, 0 0 0 4px rgb(12 105 68)`).

**Panel boundary**, same route, throw inside the chart body: 14 cards and 12 metric tiles
still rendered; only `Trips completed`'s body became
`Couldn't display Trips completed. The rest of the page still works. · Try again`, with the
card's title and `Computed 25 Jun 09:14` intact.

**`Try again` remounts, both scopes.** With the throw condition cleared between renders, the
keyboard-activated `Try again` restored the chart (1 recharts surface) at panel scope and
the whole screen (`h1: Overview`, 14 cards) at page scope.

**RTL** — captured at `dir="rtl" lang="ar"`; the fallback uses only logical utilities and
mirrors with the shell.

## Token audit

Clean across all six changed files: no palette classes, no arbitrary values, no raw hex, no
physical direction utilities, no unpaired `outline-none`.
