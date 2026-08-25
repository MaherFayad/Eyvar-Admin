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
import { ShellProvider } from './ShellContext'
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

function renderShell(path: string) {
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
  it('opens the 360° profile from ?entity= over a still-visible route', async () => {
    renderShell('/operations/people?entity=RDR-1041')
    /* AC-20 — the underlying route is still rendered behind it, and the
       workspace stays highlighted. A layer is not a destination. */
    expect(await screen.findByText('screen: operations-people')).toBeInTheDocument()
    expect(railTile('operations')).toHaveAttribute('aria-current', 'page')
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
  })

  it('renders NO scrim — §5.5, the page behind stays interactive', async () => {
    renderShell('/operations/people?entity=RDR-1041')
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    /* `sheet.tsx` deletes `SheetOverlay` outright rather than making it
       transparent, because a transparent overlay still eats pointer events. */
    expect(document.querySelector('[data-slot="sheet-overlay"]')).toBeNull()
    expect(document.querySelector('[data-slot="dialog-overlay"]')).toBeNull()
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

describe('AC-40 — at most one shell banner, ever', () => {
  it('renders none when no condition is true', async () => {
    renderShell('/operations/people')
    await screen.findByRole('main')
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
