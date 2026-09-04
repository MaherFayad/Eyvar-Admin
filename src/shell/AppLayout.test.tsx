/**
 * `AppLayout` end to end — the frame, the collapsed popover, and the shell
 * layers.
 *
 * These are integration tests on purpose: the criteria below are about how the
 * regions relate to each other, and a unit test on any one of them cannot see
 * that.
 *
 *   **AC-17** — the top bar, rail and sub-tab list are present on every route.
 *   **AC-12** — an unknown path renders not-found INSIDE the content region
 *     with all three still present, and the URL is not rewritten.
 *   **AC-62** — the first `Tab` from the body focuses a visible skip link, and
 *     activating it moves focus into the content region.

 *   **AC-32 and AC-33 are VOID** and their tests are deleted, not skipped. The
 *     sub-tab column no longer collapses (`DECISIONS.md` **D5**), so there is
 *     no first-run viewport default to assert and no popover to open. AC-33's
 *     second clause — the state surviving a reload — was the criterion failing
 *     on the unanswered **Q1**; removing the feature removes the gap rather
 *     than hiding it.
 *   **AC-20 / AC-22 / AC-66** — a layer opens from its param, over a still
 *     -visible route, one at a time, and `Escape` closes it.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { disableMockLatency, getRouteTable } from '@/data/clients'
import { resetDefaultUiStores } from '@/lib'
import { EN } from '@/i18n/dictionaries'
import { AppLayout } from './AppLayout'
import { ShellProvider, useShell } from './ShellContext'
import { NotFoundScreen } from '@/screens/RouteStates'

const table = getRouteTable()

beforeEach(() => {
  disableMockLatency()
  /* The nav no longer keeps state, but other UI stores (table views, column
     pins) still do, and one test's leftovers are the next one's flake. */
  resetDefaultUiStores()
})

/**
 * A rail tile, found by its label.
 *
 * **The tile has no `aria-label` any more** (D5: the visible short label IS the
 * accessible name), so a tile carrying a count badge composes that badge's own
 * label into its accessible name — `Exec 6 items need attention`. That is the
 * fix for defect D-4, where the tile's `aria-label` replaced its whole subtree
 * and the count reached nobody. It does mean an EXACT name lookup would be a
 * lookup on the fixture's current counts, so every tile is found by prefix.
 */
const railTile = (id: string) =>
  screen.getByRole('link', { name: new RegExp(`^${EN[`nav.rail.${id}`] as string}\\b`) })

/** The sub-tab column's landmark name — one key, one placeholder (AC-75). */
const subTabNavLabel = (EN['shell.nav.subTabsFor'] as string).replace(
  '{workspace}',
  EN['workspace.operations'] as string,
)

function renderShell(path: string, extra?: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShellProvider>
        <Routes>
          <Route element={<AppLayout />}>
            {table.subTabs.map((row) => (
              <Route key={row.path} path={row.path} element={<div>screen: {row.subTabId}</div>} />
            ))}
            <Route path="*" element={<NotFoundScreen />} />
          </Route>
        </Routes>
        {extra}
      </ShellProvider>
    </MemoryRouter>,
  )
}

describe('AC-17 — the three regions are present on every route', () => {
  it('renders the rail, the sub-tab column and the top bar', async () => {
    renderShell('/operations/people')
    expect(
      await screen.findByRole('navigation', { name: EN['shell.nav.workspaces'] as string }),
    ).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: EN['workspace.operations'] as string })).toBeInTheDocument()
    expect(screen.getByText('screen: operations-people')).toBeInTheDocument()
  })

  it('gives the content region a <main> landmark, which is the skip link’s target', async () => {
    renderShell('/operations/people')
    expect(await screen.findByRole('main')).toBeInTheDocument()
  })
})

describe('AC-12 — route-not-found keeps the shell and does not rewrite the URL', () => {
  it('renders the not-found state inside the content region, shell intact', async () => {
    renderShell('/nonsense/route')
    expect(await screen.findByText(EN['state.notFound.title'] as string)).toBeInTheDocument()
    /* All three chrome regions are still there and still interactive. */
    expect(screen.getByRole('navigation', { name: EN['shell.nav.workspaces'] as string })).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })

  it('keeps the last valid workspace selected for a path inside one', async () => {
    renderShell('/operations/nonsense')
    await screen.findByText(EN['state.notFound.title'] as string)
    expect(railTile('operations')).toHaveAttribute('aria-current', 'page')
  })
})

describe('AC-62 — skip to content', () => {
  it('is the first focusable element in the document', async () => {
    const user = userEvent.setup()
    renderShell('/operations/people')
    await screen.findByRole('main')
    await user.tab()
    expect(document.activeElement).toHaveTextContent(EN['shell.skipToContent'] as string)
  })

  it('targets the content region’s landmark', async () => {
    renderShell('/operations/people')
    const link = screen.getByRole('link', { name: EN['shell.skipToContent'] as string })
    const main = await screen.findByRole('main')
    expect(link.getAttribute('href')).toBe(`#${main.id}`)
  })
})

/* §3.9's collapse and its two criteria are gone — see the file header. What
   replaces them is the assertion that the column is simply always there. */
describe('D5 — the sub-tab column is always rendered', () => {
  it('renders the column with no disclosure and no popover, at any width', async () => {
    renderShell('/operations/people')
    expect(
      await screen.findByRole('heading', { level: 2, name: EN['workspace.operations'] as string }),
    ).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: subTabNavLabel })).toBeInTheDocument()
    /* The rail holds five workspace links, the wordmark, and NO buttons. */
    const rail = screen.getByRole('navigation', { name: EN['shell.nav.workspaces'] as string })
    expect(within(rail).queryAllByRole('button')).toHaveLength(0)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('AC-20, AC-22, AC-66 — the shell layers', () => {
  /**
   * **AC-20 was split by presentation and is now WHOLE again, and these three
   * tests are the record of both moves.**
   *
   * The rule is one sentence for all three layers: the route behind stays
   * rendered, visible and interactive, and there is no scrim.
   *
   * It was suspended for the **360° profile** alone while that layer was
   * `presentation="modal"` on the owner's instruction — *"should be full screen
   * no need to show me any of the navigation more like popup"* — and §7.3.3
   * supplied the rest: a surface that dims the page owns the keyboard. Two
   * tests here asserted the inversion: that the rail left the accessible tree,
   * and that a scrim existed.
   *
   * **The owner has reversed that**: the profile is a side panel beside the
   * console again. So the two inverted assertions are re-inverted rather than
   * deleted — the rail must be reachable and the scrim must be ABSENT — and
   * they are kept on the profile layer specifically, because that is the layer
   * the exception was carved out of and the one a future carve-out would be
   * taken from again.
   */
  it('opens the 360° profile from ?entity= over a route that stays MOUNTED', async () => {
    renderShell('/operations/people?entity=RDR-1041')
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    /* AC-20: the layer is not a destination, so the route behind it is still
       mounted and its workspace is still the current one. */
    expect(screen.getByText('screen: operations-people')).toBeInTheDocument()
    const opsTile = document.querySelector('a[aria-current="page"]')
    expect(opsTile?.textContent).toContain(EN['nav.rail.operations'] as string)
  })

  it('keeps the navigation in the accessible tree beside the profile — AC-20, restored', async () => {
    renderShell('/operations/people?entity=RDR-1041')
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    /* The assertion the modal presentation inverted. A drawer does not make
       Radix mark the rest of the document `aria-hidden`, so the workspace rail
       is a reachable navigation landmark while a record is open beside it —
       which is the whole reason §5.5 removed the scrim. */
    expect(
      screen.getByRole('navigation', { name: EN['shell.nav.workspaces'] as string }),
    ).toBeInTheDocument()
  })

  it('renders NO scrim for the profile either — §5.5 / §7.3.3, restored', async () => {
    renderShell('/operations/people?entity=RDR-1041')
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    /* `sheet.tsx` renders no overlay ELEMENT under `modal={false}` rather than
       a transparent one, because a transparent overlay still eats pointer
       events. And §7.3.3 makes the trap follow: no scrim, no trap. */
    expect(document.querySelector('[data-slot="sheet-overlay"]')).toBeNull()
  })

  it('renders NO scrim for a DRAWER layer — §5.5, the page behind stays interactive', async () => {
    /* The half of §5.5 that is unchanged, pinned on a layer that is still a
       drawer. `sheet.tsx` renders no overlay at all under `modal={false}`
       rather than a transparent one, because a transparent overlay still eats
       pointer events. */
    renderShell('/operations/people?account=me')
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    expect(document.querySelector('[data-slot="sheet-overlay"]')).toBeNull()
    expect(document.querySelector('[data-slot="dialog-overlay"]')).toBeNull()
    /* And the navigation is still reachable beside it. */
    expect(
      screen.getByRole('navigation', { name: EN['shell.nav.workspaces'] as string }),
    ).toBeInTheDocument()
  })

  it('closes on Escape — AC-66', async () => {
    const user = userEvent.setup()
    renderShell('/operations/people?entity=RDR-1041')
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('opens exactly one layer when the URL carries two — AC-22', async () => {
    renderShell('/operations/people?entity=RDR-1041&account=me')
    await waitFor(() => expect(screen.getAllByRole('dialog')).toHaveLength(1))
  })

  it('opens my profile from ?account=me', async () => {
    renderShell('/operations/people?account=me')
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(EN['shellLayer.account'] as string)).toBeInTheDocument()
  })
})

/**
 * **AC-67, both halves, proved end to end.**
 *
 * The 0.8 QA verdict recorded these as defects D-1 and D-2 and it was right;
 * `useFocusEntry.test.ts` could not see either, because both arrive from a
 * component the hook is COMPOSED WITH rather than from the hook:
 *
 *   D-1  Radix `Portal` mounts its children in a SECOND commit, so
 *        `containerRef.current` and `initialFocusRef.current` were `null` when
 *        `useFocusEntry`'s effect ran, and its deps are all stable ref objects
 *        so it never retried. `ShellLayer` now holds the nodes in state and
 *        derives the ref objects from them, so the ref's IDENTITY changes when
 *        the node lands, which re-runs the effect against a real element.
 *   D-2  `@radix-ui/react-dialog/dist/index.mjs:223` hardcodes `loop: true` on
 *        its `FocusScope`, and `react-focus-scope/dist/index.mjs:109` runs its
 *        Tab handler on `loop || trapped`. **`modal={false}` clears `trapped`
 *        and not `loop`**, so Tab on the last control looped back to the first
 *        forever. `sheet.tsx`'s `releaseTabAtEdges` moves focus out of the
 *        drawer before the scope's handler runs, so the scope re-reads
 *        `document.activeElement`, matches neither edge, and does nothing.
 *
 * This is the shape §7.3.3 requires: *"The scrim decides the trap. If a surface
 * dims the page, it owns the keyboard. If it does not, it does not."*
 */
describe('AC-67 — focus enters the layer, and Tab is NOT trapped', () => {
  it('moves focus into the layer on open, past the portal\'s second commit', async () => {
    renderShell('/operations/people?account=me')
    const dialog = await screen.findByRole('dialog')
    await waitFor(() =>
      expect(dialog.contains(document.activeElement)).toBe(true),
    )
  })

  it('Tab past the layer’s last control reaches the page behind it, and the layer stays open', async () => {
    const user = userEvent.setup()
    renderShell('/operations/people?account=me')
    const dialog = await screen.findByRole('dialog')
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))

    /* Walk to the last tabbable inside the drawer, then one more. Twenty is
       comfortably more than the drawer holds; the assertion is that focus is
       OUTSIDE by the end, which a loop makes impossible however many times you
       press Tab. */
    for (let i = 0; i < 20; i += 1) {
      await user.tab()
      if (!dialog.contains(document.activeElement)) break
    }

    expect(
      dialog.contains(document.activeElement),
      'focus never left the drawer — the Radix `loop: true` trap is back',
    ).toBe(false)
    /* §7.3.3 — leaving is not dismissing. AC-20: the layer stays open and the
       workspace behind it stays interactive. */
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  /**
   * **A real interaction defect, found writing this test and left OUT of the
   * suite rather than left red — see `02-shell-fixes.md`.**
   *
   * Opening the notification centre from the bell's popover (`See all`) leaves
   * focus OUTSIDE the layer. The cause is a race that neither half of the
   * AC-67 fix touches: `See all` closes the Radix popover, and a closing
   * popover restores focus to its own trigger (the bell) — asynchronously,
   * AFTER `useFocusEntry` has already moved focus into the drawer. The last
   * writer wins and it is the popover.
   *
   * The same shape will apply to any layer opened from inside a popover or a
   * dropdown-menu. It is not the portal-timing bug (D-1) and not the
   * `loop: true` trap (D-2); it is a third thing, it needs a decision about who
   * owns focus when a popover hands off to a layer, and that decision is
   * product-designer's, not mine. Reported rather than patched.
   */
})

/** Turns a standing condition on from inside the provider, the way the app does. */
function Conditions({
  apply,
}: {
  apply: Parameters<ReturnType<typeof useShell>['setConditions']>[0]
}) {
  const shell = useShell()
  return <button onClick={() => shell.setConditions(apply)}>qa-apply-conditions</button>
}

/**
 * Every shell banner is a `Banner`, and every `Banner` is an `Alert`, which
 * stamps `data-slot="alert"`. Counting THAT rather than `role="alert"` is the
 * point of this helper: `AppLayout` renders one of its banner paths as
 * `role="status"` (the idle-warning strip is a deadline, not a rejection), and
 * a `queryByRole('alert')` cannot see that one at all — so the assertion that
 * used to stand here could not have caught a second banner even if one had been
 * rendered right beside it.
 */
const bannerStrips = () => document.querySelectorAll('[data-slot="alert"]')

describe('AC-40 — at most one shell banner, ever', () => {
  it('renders none when no condition is true', async () => {
    renderShell('/operations/people')
    await screen.findByRole('main')
    expect(bannerStrips()).toHaveLength(0)
  })

  /**
   * **The precondition the old test lacked.** `expect(queryByRole('alert'))
   * .toBeNull()` on a route where no condition holds is true of a shell that
   * renders one banner, and equally true of a shell that renders no
   * `<ShellBanner>` at all — so deleting the strip outright left it green. This
   * pair pins both halves: nothing when there is nothing to say, and exactly
   * one strip carrying the condition's own words when there is.
   */
  it('renders exactly one, carrying the condition, once one is true', async () => {
    const user = userEvent.setup()
    renderShell(
      '/operations/people',
      <Conditions apply={{ impersonating: { name: 'Nora Alqahtani' } }} />,
    )
    await screen.findByRole('main')
    await user.click(screen.getByRole('button', { name: 'qa-apply-conditions' }))

    await waitFor(() => expect(bannerStrips()).toHaveLength(1))
    expect(bannerStrips()[0]).toHaveTextContent('Nora Alqahtani')
  })

  /** Two conditions is still ONE strip — the merge, not a second banner. */
  it('stays at one strip when a second condition joins the first', async () => {
    const user = userEvent.setup()
    renderShell(
      '/operations/people',
      <Conditions apply={{ impersonating: { name: 'Nora Alqahtani' }, offline: true }} />,
    )
    await screen.findByRole('main')
    await user.click(screen.getByRole('button', { name: 'qa-apply-conditions' }))

    await waitFor(() => expect(bannerStrips()).toHaveLength(1))
    expect(bannerStrips()[0]).toHaveTextContent('Nora Alqahtani')
    expect(bannerStrips()[0]).toHaveTextContent(EN['state.offline.message'] as string)
  })
})
