/**
 * **QA (0.8) — behavioural verification of the app shell against
 * `docs/05-restructure/specs/00-foundation.md` §10.**
 *
 * Written by qa-engineer, independently of `AppLayout.test.tsx` and
 * `nav.test.tsx`. Every `it` name quotes the criterion it verifies, so a
 * failure report reads as "AC-24 failed", not "expected true to be false".
 *
 * Criteria covered here (the integration ones — a unit test cannot see them):
 * AC-06, AC-07, AC-11, AC-13, AC-14, AC-17, AC-18, AC-21, AC-23, AC-24,
 * AC-28, AC-32, AC-36, AC-40, AC-42, AC-51, AC-52, AC-59.
 *
 * Everything is queried by role, name and text. The one exception is recorded
 * in the verdict file.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen, waitFor, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  disableMockLatency,
  getRouteTable,
  mockFailures,
  resetDataLayer,
  switchMockUser,
} from '@/data/clients'
import { resetDefaultUiStores, UI_STATE_KEYS } from '@/lib'
import { EN } from '@/i18n/dictionaries'
import { AppLayout } from './AppLayout'
import { ShellProvider, useShell, type SaveBarModel } from './ShellContext'
import { AppRoutes } from '@/routes'
import { Toaster } from '@/components/ui/sonner'
import { NotFoundScreen } from '@/screens/RouteStates'

const table = getRouteTable()
const en = (key: string) => EN[key] as string

const WIDE = 1440

function setViewport(px: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: px })
}

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
  resetDefaultUiStores()
  setViewport(WIDE)
})

afterEach(() => {
  document.documentElement.removeAttribute('dir')
  document.documentElement.removeAttribute('lang')
})

/** The shell with a stub screen per route — enough to see the chrome. */
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

/** The REAL router tree, so AC-13 / AC-14 / AC-07 are checked against what ships. */
function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShellProvider>
        <AppRoutes />
      </ShellProvider>
    </MemoryRouter>,
  )
}

const railName = () => en('shell.nav.workspaces')

/**
 * **Round 2 — D5: the rail tile's visible label IS its accessible name.**
 * `Exec · Ops · Finance · Support · Admin`, and where a tile carries a count
 * badge the badge's own `aria-label` composes into the tile's name —
 * `Ops 35 items need attention` — because the tile sets no `aria-label` of its
 * own any more (the fix for D-4). The lookup is anchored at the label and left
 * open at the end, so it survives a workspace gaining or losing a backlog.
 *
 * The full names have not gone: `Operations` and `Customer Support` are the
 * sub-tab column's `<h2>`, and the assertions on that heading still use
 * `workspace.*`.
 */
const railLabel = (id: string) => en(`nav.rail.${id}`)
const railTileName = (id: string) => new RegExp(`^${railLabel(id)}\\b`)
const railTile = (id: string, scope?: HTMLElement) =>
  (scope ? within(scope) : screen).getByRole('link', { name: railTileName(id) })

/**
 * A sub-tab row's accessible name is its label PLUS its count badge, because
 * the badge in the column carries no `aria-label` of its own (the rail tile's
 * does). So `People 7` is the real accessible name, and a QA finding — see the
 * verdict file, defect **D-3**. Matching by prefix here rather than papering
 * over it with a test id.
 */
const rowName = (title: string) => (name: string) =>
  name === title || name.startsWith(`${title} `)

/* ══════════════════════════ navigation and routing ══════════════════════ */

describe('AC-06 — "Every workspace\'s first sub-tab is Overview, and selecting the workspace tile navigates to it"', () => {
  it('points every one of the five rail tiles at that workspace\'s Overview route', async () => {
    renderShell('/operations/people')
    const rail = await screen.findByRole('navigation', { name: railName() })

    for (const workspace of table.workspaces) {
      const tile = railTile(workspace.id, rail)
      const href = tile.getAttribute('href')
      const overview = table.subTabs.find(
        (r) => r.workspaceId === workspace.id && r.order === 1,
      )
      expect(overview, `${workspace.id} has no order-1 row`).toBeDefined()
      /* The criterion is "navigates to it" — the tile's target must BE the
         workspace's first sub-tab, not merely a path that looks like one. */
      expect(href, workspace.id).toBe(overview?.path)
      expect(en(overview!.titleKey), workspace.id).toBe('Overview')
    }
  })

  it('actually lands on that route when the tile is activated', async () => {
    const user = userEvent.setup()
    renderShell('/operations/people')
    const rail = await screen.findByRole('navigation', { name: railName() })
    await user.click(railTile('financials', rail))
    expect(await screen.findByText('screen: financials-overview')).toBeInTheDocument()
  })
})

describe('AC-07 — "Signing in as each of the four roles lands on that role\'s workspace"', () => {
  /* The seeded roster is USR-1 Owner · USR-2 Finance · USR-3 Support ·
     USR-4 Support · USR-5 Ops Manager (`fixtures/teamUsers.ts`). */
  const cases = [
    ['USR-1', '/management/overview'],
    ['USR-2', '/financials/overview'],
    ['USR-3', '/support/overview'],
    ['USR-5', '/operations/overview'],
  ] as const

  it.each(cases)('lands %s on %s', async (userId, expected) => {
    await switchMockUser(userId)
    renderApp('/')
    /* The landing is role-derived through `session.landingRoute`; the assertion
       is on what the operator SEES — the sub-tab column's active row and the
       rail's active tile — not on a redirect target string. */
    const row = table.subTabs.find((r) => r.path === expected)
    expect(row, expected).toBeDefined()
    const link = await screen.findByRole('link', { name: rowName(en(row!.titleKey)) })
    await waitFor(() => expect(link).toHaveAttribute('aria-current', 'page'))
  })

  it('covers all four roles named in §3.3 and no role is missing a landing', async () => {
    const seen = new Set<string>()
    for (const [userId] of cases) {
      const session = await switchMockUser(userId)
      seen.add(session.role)
      expect(session.landingRoute, session.role).toBeTruthy()
    }
    expect([...seen].sort()).toEqual(['Finance', 'Ops Manager', 'Owner', 'Support'])
  })
})

describe('AC-11 — "Browser Back after three navigations returns through the three previous routes in order; Forward returns to the deepest"', () => {
  function History() {
    const navigate = useNavigate()
    return (
      <>
        <button onClick={() => navigate(-1)}>qa-back</button>
        <button onClick={() => navigate(1)}>qa-forward</button>
      </>
    )
  }

  it('walks back through three routes with both nav columns following', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/operations/overview']}>
        <ShellProvider>
          <Routes>
            <Route element={<AppLayout />}>
              {table.subTabs.map((row) => (
                <Route key={row.path} path={row.path} element={<div>screen: {row.subTabId}</div>} />
              ))}
              <Route path="*" element={<NotFoundScreen />} />
            </Route>
          </Routes>
          <History />
        </ShellProvider>
      </MemoryRouter>,
    )

    await screen.findByText('screen: operations-overview')
    const column = screen.getByRole('navigation', {
      name: (en('shell.nav.subTabsFor') as string).replace('{workspace}', en('workspace.operations')),
    })

    await user.click(within(column).getByRole('link', { name: rowName(en('subtab.operations.trips')) }))
    await screen.findByText('screen: operations-trips')
    await user.click(within(column).getByRole('link', { name: rowName(en('subtab.operations.people')) }))
    await screen.findByText('screen: operations-people')
    await user.click(within(column).getByRole('link', { name: rowName(en('subtab.operations.requests')) }))
    await screen.findByText('screen: operations-requests')

    const back = screen.getByRole('button', { name: 'qa-back' })
    await user.click(back)
    expect(await screen.findByText('screen: operations-people')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: rowName(en('subtab.operations.people')) })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await user.click(back)
    expect(await screen.findByText('screen: operations-trips')).toBeInTheDocument()
    await user.click(back)
    expect(await screen.findByText('screen: operations-overview')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'qa-forward' }))
    expect(await screen.findByText('screen: operations-trips')).toBeInTheDocument()
  })

  it('leaves the destination highlighted, never the origin, on a Back (AC-08, fifth kind)', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/operations/overview', '/financials/revenue']} initialIndex={1}>
        <ShellProvider>
          <Routes>
            <Route element={<AppLayout />}>
              {table.subTabs.map((row) => (
                <Route key={row.path} path={row.path} element={<div>screen: {row.subTabId}</div>} />
              ))}
            </Route>
          </Routes>
          <History />
        </ShellProvider>
      </MemoryRouter>,
    )
    await screen.findByText('screen: financials-revenue')
    await user.click(screen.getByRole('button', { name: 'qa-back' }))
    await screen.findByText('screen: operations-overview')
    expect(railTile('operations')).toHaveAttribute('aria-current', 'page')
    expect(railTile('financials')).not.toHaveAttribute('aria-current')
  })
})

describe('AC-13 — "On /financials/pricing/plans/1/edit, neither the rail, the sub-tab list, nor the app top bar is in the DOM"', () => {
  it('has none of the three chrome regions in the document', async () => {
    renderApp('/financials/pricing/plans/1/edit')
    await waitFor(() =>
      expect(screen.queryByRole('navigation', { name: railName() })).toBeNull(),
    )
    expect(screen.queryByRole('navigation')).toBeNull()
    /* The editor ships its OWN bar, which is also a <header>. What must be
       absent is the APP top bar, identified by the four slots only it has. */
    expect(screen.queryByRole('button', { name: en('shell.topbar.notifications') })).toBeNull()
    expect(screen.queryByRole('button', { name: en('shell.topbar.account') })).toBeNull()
    expect(screen.queryByRole('searchbox', { name: en('shell.topbar.search') })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Eyvar' })).toBeNull()
  })

  it('carries a bar with exit, the plan name, a status badge and a Save', async () => {
    renderApp('/financials/pricing/plans/1/edit')
    expect(await screen.findByText('1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: en('shell.topbar.back') })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: en('shell.saveBar.save') })).toBeInTheDocument()
    /* §2.5 — greyed when there is nothing to save. */
    expect(screen.getByRole('button', { name: en('shell.saveBar.save') })).toBeDisabled()
  })

  it('returns to /financials/pricing with both columns restored and Pricing & Plans selected', async () => {
    const user = userEvent.setup()
    renderApp('/financials/pricing/plans/1/edit')
    await user.click(await screen.findByRole('button', { name: en('shell.topbar.back') }))

    const rail = await screen.findByRole('navigation', { name: railName() })
    expect(railTile('financials', rail)).toHaveAttribute('aria-current', 'page')
    expect(
      screen.getByRole('link', { name: rowName(en('subtab.financials.pricing')) }),
    ).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })
})

describe('AC-14 — "On /operations/dispatch the rail, the sub-tab list, the app top bar and the page header are all present"', () => {
  it('keeps all four, unlike the bleed route', async () => {
    renderApp('/operations/dispatch')
    expect(await screen.findByRole('navigation', { name: railName() })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: en('workspace.operations') }),
    ).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    /* The page header carries the sub-tab title as an h1 — §8 slot 2. */
    expect(
      screen.getByRole('heading', { level: 1, name: en('subtab.operations.dispatch') }),
    ).toBeInTheDocument()
  })
})

describe('AC-17 — "The top bar, rail and sub-tab list are present on every route except the plan editor"', () => {
  it('renders all three on all 34 sub-tab routes', async () => {
    for (const row of table.subTabs) {
      const view = renderShell(row.path)
      expect(
        await screen.findByRole('navigation', { name: railName() }),
        row.path,
      ).toBeInTheDocument()
      expect(screen.getByRole('banner'), row.path).toBeInTheDocument()
      expect(
        screen.getByRole('heading', { level: 2 }),
        row.path,
      ).toBeInTheDocument()
      view.unmount()
    }
  })

  it('renders all three on each of the five level-3 detail routes that are not bleed', async () => {
    const details = table.subTabs.flatMap((r) =>
      r.detailRoutes.filter((d) => d.shape !== 'bleed').map((d) => ({ row: r, d })),
    )
    expect(details.length).toBeGreaterThan(0)
    for (const { d } of details) {
      const concrete = d.path.replace(/:[A-Za-z]+/g, 'X-1')
      const view = renderApp(concrete)
      expect(
        await screen.findByRole('navigation', { name: railName() }),
        concrete,
      ).toBeInTheDocument()
      expect(screen.getByRole('banner'), concrete).toBeInTheDocument()
      view.unmount()
    }
  })
})

describe('AC-18 — "The rail, sub-tab list and top bar are not remounted by navigation"', () => {
  it('keeps the same DOM nodes after twenty route changes', async () => {
    const user = userEvent.setup()
    renderShell('/operations/overview')
    const rail = await screen.findByRole('navigation', { name: railName() })
    const bar = screen.getByRole('banner')
    const column = screen.getByRole('heading', { level: 2 }).closest('nav')
    expect(column).not.toBeNull()

    const rows = table.subTabs.filter((r) => r.workspaceId === 'operations')
    for (let i = 0; i < 20; i += 1) {
      const target = rows[i % rows.length]!
      await user.click(screen.getByRole('link', { name: rowName(en(target.titleKey)) }))
      await screen.findByText(`screen: ${target.subTabId}`)
    }

    /* React replaces the DOM node when a component remounts, so identity of the
       node IS the remount counter AC-18 describes, without touching source. */
    expect(screen.getByRole('navigation', { name: railName() })).toBe(rail)
    expect(screen.getByRole('banner')).toBe(bar)
    expect(screen.getByRole('heading', { level: 2 }).closest('nav')).toBe(column)
  })
})

describe('AC-21 — "Browser Back with a shell layer open closes the layer and stays on the same underlying route"', () => {
  function History() {
    const navigate = useNavigate()
    return <button onClick={() => navigate(-1)}>qa-back</button>
  }

  it('closes the layer on the first Back and leaves the route on the second', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/financials/revenue', '/operations/people']} initialIndex={1}>
        <ShellProvider>
          <Routes>
            <Route element={<AppLayout />}>
              {table.subTabs.map((row) => (
                <Route key={row.path} path={row.path} element={<div>screen: {row.subTabId}</div>} />
              ))}
            </Route>
          </Routes>
          <History />
        </ShellProvider>
      </MemoryRouter>,
    )
    await screen.findByText('screen: operations-people')

    /* Open the layer the way the shell does — through the notification bell's
       "See all", which is a real operator path, so the push is real. */
    await user.click(screen.getByRole('button', { name: en('shell.topbar.notifications') }))
    await user.click(await screen.findByRole('button', { name: en('shell.notifications.seeAll') }))
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())

    const back = screen.getByRole('button', { name: 'qa-back' })
    await user.click(back)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    /* Still on the same underlying route. */
    expect(screen.getByText('screen: operations-people')).toBeInTheDocument()

    await user.click(back)
    expect(await screen.findByText('screen: financials-revenue')).toBeInTheDocument()
  })
})

describe('AC-23 — "A toast raised on /operations/people is still visible after navigating to /financials/revenue"', () => {
  it('survives the route change within its dismiss window', async () => {
    const user = userEvent.setup()
    renderShell('/operations/people', <Toaster />)
    await screen.findByText('screen: operations-people')

    act(() => {
      toast('Applicant approved')
    })
    expect(await screen.findByText('Applicant approved')).toBeInTheDocument()

    await user.click(railTile('financials'))
    await screen.findByText('screen: financials-overview')
    expect(screen.getByText('Applicant approved')).toBeInTheDocument()
  })
})

describe('AC-24 — "When a sub-tab\'s data load fails it renders its error state AND the rail, sub-tab list and top bar remain interactive"', () => {
  /**
   * **Round 3 — and the last time this can be re-pointed, so it now tests the
   * criterion instead of an implementation detail.**
   *
   * Round 1 ran against `/operations/people` and injected `navCounts.list`,
   * because that route was `SubTabScreen` and the placeholder's only read was
   * the nav counts. When `PeopleScreen` shipped, the injection stopped producing
   * a page error and the test was re-pointed to `/operations/trips` — *"still on
   * the shared placeholder"*. `TripsScreen` has since shipped too.
   *
   * **There is no fourth route to run away to.** Every one of the 35 sub-tabs
   * now has a real screen; `SubTabScreen` is unreachable. So the fix is not
   * another re-point: it is to inject the failure into **the read the screen
   * under test actually performs** — `trips.list` — which is what AC-24 says in
   * the first place. *"A sub-tab's data load"* means the sub-tab's, not the
   * shell's.
   *
   * This is strictly stronger than what it replaces. The old form proved the
   * shared placeholder's error path; this proves a **built screen** honours the
   * contract, which is what the round-2 comment recorded as an open coverage
   * question and could not itself answer.
   *
   * `TripsScreen` had no error branch at all when this was written — the read
   * failed and the operator got a live toolbar above a list that never arrived.
   * That was the ninth of the nine failing tests in the remediation plan, and
   * fixing the screen is what makes this pass.
   */
  it('renders the page error and still navigates to another sub-tab without a reload', async () => {
    const user = userEvent.setup()
    mockFailures.always('trips.list')
    renderApp('/operations/trips')

    const title = en('subtab.operations.trips')
    expect(
      await screen.findByText((en('state.pageError.title') as string).replace('{resource}', title)),
    ).toBeInTheDocument()

    /* The chrome is still there AND still works: this is the single most
       important shell behaviour in §9.2. */
    const rail = screen.getByRole('navigation', { name: railName() })
    expect(rail).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: rowName(en('subtab.operations.requests')) }))
    expect(
      await screen.findByRole('heading', { level: 1, name: en('subtab.operations.requests') }),
    ).toBeInTheDocument()
    /* …and the rail followed, without a reload. */
    expect(railTile('operations', rail)).toHaveAttribute('aria-current', 'page')
  })

  it('names a retry action on the failed sub-tab (AC-36)', async () => {
    mockFailures.always('trips.list')
    renderApp('/operations/trips')
    expect(
      await screen.findByRole('button', { name: en('state.pageError.action') }),
    ).toBeInTheDocument()
  })
})

describe('AC-36 — "With the mock client forced to fail, every shell region that reads data renders an error state naming a retry action"', () => {
  it('renders the shell error state in the content region when identity fails, shell intact', async () => {
    mockFailures.always('session.current')
    renderApp('/operations/people')

    expect(await screen.findByText(en('state.shellError.title'))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: en('state.shellError.action') })).toBeInTheDocument()
    /* §9.1 — "shell intact ... the operator can still see where they are". */
    expect(screen.getByRole('navigation', { name: railName() })).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })

  it('recovers on retry when the failure is injected once', async () => {
    const user = userEvent.setup()
    mockFailures.once('session.current')
    renderApp('/operations/people')
    await user.click(await screen.findByRole('button', { name: en('state.shellError.action') }))
    expect(
      await screen.findByRole('heading', { level: 1, name: en('subtab.operations.people') }),
    ).toBeInTheDocument()
  })

  /**
   * **D-10 — `?mockFail=` was dead. Found in round 2, fixed during round 2,
   * and the test stays.**
   *
   * AC-36 says the failure is induced *"without editing source"*.
   * `seedMockFailuresFromLocation` is that mechanism and its own doc comment
   * has said *"Call once at boot, before the first render, from the app entry
   * point"* since 0.2 — and for six waves **no entry point called it.** The
   * only references in the repo were the barrel re-export and `seam.test.ts`,
   * which unit-tests it with a hand-passed string.
   *
   * **Why it was not cosmetic.** Vitest reaches `mockFailures` by import.
   * Playwright, visual-QA and anyone driving the built app cannot — for them
   * `?mockFail=drivers.list` is the ONLY door to an error state, and it was
   * bricked. Reviewing §9.2's error states at 1280 is a visual-QA requirement
   * that nobody could satisfy.
   *
   * Kept because the wire is a single statement in a file nobody edits, with
   * no test elsewhere that would notice its removal.
   */
  it('seeds ?mockFail= from an entry point at boot, which is AC-36\'s "without editing source"', () => {
    const main = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8')
    expect(main).toMatch(/seedMockFailuresFromLocation\s*\(/)
    /* **Before the first render, not inside a component.** Every mock client
       takes from the registry on its way out and `ShellProvider` fires three
       reads in its first effect, so a call ordered after `createRoot` would
       apply the failure to the retry rather than to the load — which looks
       like it works and does not. Order is the whole contract here. */
    expect(main.indexOf('seedMockFailuresFromLocation(')).toBeLessThan(
      main.indexOf('createRoot('),
    )
  })

  it('renders an error inside the shell layer when the profile read fails, layer still dismissible', async () => {
    const user = userEvent.setup()
    mockFailures.always('profile.resolve')
    renderShell('/operations/people?entity=RDR-1041')
    const dialog = await screen.findByRole('dialog')
    expect(
      await within(dialog).findByRole('button', { name: en('state.overlayError.action') }),
    ).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
})

describe('AC-42 — "Opening the profile layer for an id that does not resolve shows a No record found state naming the id searched"', () => {
  it('names the id inside the layer and leaves the layer dismissible', async () => {
    const user = userEvent.setup()
    renderShell('/operations/people?entity=NOPE-1')
    const dialog = await screen.findByRole('dialog')
    expect(
      await within(dialog).findByText(
        (en('state.overlayNotFound.message') as string).replace('{id}', 'NOPE-1'),
      ),
    ).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
})

describe('AC-28 — "Exactly one setInterval is registered by the application"', () => {
  it('registers NONE from application code across a boot and four navigations', async () => {
    const user = userEvent.setup()
    /* Testing Library's own `waitFor` polls with `setInterval`, so a raw call
       count is the harness's, not the app's. Only frames outside `node_modules`
       count as "registered by the application". */
    const appStacks: string[] = []
    const real = window.setInterval
    const spy = vi
      .spyOn(window, 'setInterval')
      .mockImplementation(((handler: TimerHandler, timeout?: number, ...rest: unknown[]) => {
        const stack = new Error().stack ?? ''
        const appFrames = stack
          .split(String.fromCharCode(10))
          .slice(2)
          .filter((line) => /[\\/]src[\\/]/.test(line))
          .filter((line) => !line.includes('qa.shell.test'))
        if (appFrames.length > 0) appStacks.push(appFrames[0] as string)
        return real(handler, timeout, ...rest)
      }) as typeof window.setInterval)

    renderShell('/operations/overview')
    await screen.findByText('screen: operations-overview')
    for (const id of [
      'operations-trips',
      'operations-people',
      'operations-requests',
      'operations-overview',
    ]) {
      const row = table.subTabs.find((r) => r.subTabId === id)!
      await user.click(screen.getByRole('link', { name: rowName(en(row.titleKey)) }))
      await screen.findByText(`screen: ${id}`)
    }

    expect(appStacks, appStacks.join(' | ')).toHaveLength(0)
    spy.mockRestore()
  })
})

/* ═══════════════════════════ AC-40 — the banner ═════════════════════════ */

function Conditions({ apply }: { apply: Parameters<ReturnType<typeof useShell>['setConditions']>[0] }) {
  const shell = useShell()
  return (
    <button onClick={() => shell.setConditions(apply)}>qa-apply-conditions</button>
  )
}

describe('AC-40 — "Rendering the shell while impersonating shows exactly one banner; impersonating AND offline shows exactly one banner carrying a count"', () => {
  it('shows exactly one banner while impersonating', async () => {
    const user = userEvent.setup()
    renderShell('/operations/people', <Conditions apply={{ impersonating: { name: 'Nora Alqahtani' } }} />)
    await screen.findByText('screen: operations-people')
    await user.click(screen.getByRole('button', { name: 'qa-apply-conditions' }))
    const banners = await screen.findAllByRole('alert')
    expect(banners).toHaveLength(1)
    expect(banners[0]).toHaveTextContent('Nora Alqahtani')
  })

  it('merges impersonating AND offline into ONE banner carrying the count 2, not two banners', async () => {
    const user = userEvent.setup()
    renderShell(
      '/operations/people',
      <Conditions apply={{ impersonating: { name: 'Nora Alqahtani' }, offline: true }} />,
    )
    await screen.findByText('screen: operations-people')
    await user.click(screen.getByRole('button', { name: 'qa-apply-conditions' }))
    const banners = await screen.findAllByRole('alert')
    expect(banners).toHaveLength(1)
    expect(banners[0]).toHaveTextContent(
      (en('state.merged.message') as string).replace('{count}', '2'),
    )
    /* §4.2 — and then each condition on its own line, so nothing is lost. */
    expect(banners[0]).toHaveTextContent('Nora Alqahtani')
    expect(banners[0]).toHaveTextContent(en('state.offline.message'))
  })

  it('merges all THREE standing conditions into one', async () => {
    const user = userEvent.setup()
    renderShell(
      '/operations/people',
      <Conditions
        apply={{
          impersonating: { name: 'Nora Alqahtani' },
          offline: true,
          call: { name: 'Rider 4471', duration: '2m 10s' },
        }}
      />,
    )
    await screen.findByText('screen: operations-people')
    await user.click(screen.getByRole('button', { name: 'qa-apply-conditions' }))
    const banners = await screen.findAllByRole('alert')
    expect(banners).toHaveLength(1)
    expect(banners[0]).toHaveTextContent(
      (en('state.merged.message') as string).replace('{count}', '3'),
    )
  })
})

/* ═══════════════════════ AC-51 / AC-52 — the save bar ═══════════════════ */

function SaveBarDriver({ model }: { model: SaveBarModel }) {
  const shell = useShell()
  return <button onClick={() => shell.setSaveBar(model)}>qa-dirty</button>
}

const baseSaveBar: SaveBarModel = {
  status: 'dirty',
  entity: null,
  canSave: true,
  canDiscard: true,
  isSaving: false,
  onSave: () => undefined,
  onDiscard: () => undefined,
}

describe('AC-51 — "the save bar replaces the top bar at the same height; the content below does not move"', () => {
  it('replaces the top bar in the SAME slot — one bar, never two', async () => {
    const user = userEvent.setup()
    renderShell('/operations/people', <SaveBarDriver model={baseSaveBar} />)
    const bar = await screen.findByRole('banner')
    const slot = bar.parentElement
    expect(slot).not.toBeNull()
    const childrenBefore = slot!.children.length

    await user.click(screen.getByRole('button', { name: 'qa-dirty' }))

    /* The top bar is gone and the save bar took its place: same parent, same
       number of children, same index. Nothing is stacked or overlaid. */
    await waitFor(() => expect(screen.queryByRole('banner')).toBeNull())
    expect(slot!.children.length).toBe(childrenBefore)
    expect(screen.getByText(en('shell.saveBar.dirty'))).toBeInTheDocument()
    expect(slot!.firstElementChild).toContainElement(screen.getByText(en('shell.saveBar.dirty')))
  })

  it('keeps both nav columns mounted while the save bar is up (§4.1, not dimmed)', async () => {
    const user = userEvent.setup()
    renderShell('/operations/people', <SaveBarDriver model={baseSaveBar} />)
    await screen.findByRole('banner')
    await user.click(screen.getByRole('button', { name: 'qa-dirty' }))
    await screen.findByText(en('shell.saveBar.dirty'))
    expect(screen.getByRole('navigation', { name: railName() })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: en('workspace.operations') })).toBeInTheDocument()
  })

  it('uses the entity-specific label when a named record is being edited (§2.3)', async () => {
    const user = userEvent.setup()
    renderShell(
      '/operations/people',
      <SaveBarDriver model={{ ...baseSaveBar, entity: 'plan' }} />,
    )
    await screen.findByRole('banner')
    await user.click(screen.getByRole('button', { name: 'qa-dirty' }))
    expect(
      await screen.findByText((en('shell.saveBar.dirtyEntity') as string).replace('{entity}', 'plan')),
    ).toBeInTheDocument()
  })
})

describe('AC-52 — "With the form dirty and invalid, Save is disabled and Discard is enabled"', () => {
  it('disables Save and leaves Discard enabled', async () => {
    const user = userEvent.setup()
    renderShell(
      '/operations/people',
      <SaveBarDriver
        model={{ ...baseSaveBar, status: 'dirty-invalid', canSave: false, canDiscard: true }}
      />,
    )
    await screen.findByRole('banner')
    await user.click(screen.getByRole('button', { name: 'qa-dirty' }))
    expect(await screen.findByRole('button', { name: en('shell.saveBar.save') })).toBeDisabled()
    expect(screen.getByRole('button', { name: en('shell.saveBar.discard') })).toBeEnabled()
  })

  it('disables Discard for the duration of a save in flight (§9.2 #7)', async () => {
    const user = userEvent.setup()
    renderShell(
      '/operations/people',
      <SaveBarDriver
        model={{
          ...baseSaveBar,
          status: 'save-in-flight',
          canSave: false,
          canDiscard: false,
          isSaving: true,
        }}
      />,
    )
    await screen.findByRole('banner')
    await user.click(screen.getByRole('button', { name: 'qa-dirty' }))
    expect(await screen.findByRole('button', { name: en('shell.saveBar.discard') })).toBeDisabled()
    /* The in-flight `Save` carries a `role="status"` spinner, so its accessible
       name becomes `Loading Save` — recorded as defect D-6. */
    expect(
      screen.getByRole('button', { name: (n: string) => n.includes(en('shell.saveBar.save')) }),
    ).toBeDisabled()
  })
})

/* ═════════════════════════ AC-59 — role switching ═══════════════════════ */

function RoleSwitcher({ userId }: { userId: string }) {
  const shell = useShell()
  return (
    <button
      onClick={async () => {
        await switchMockUser(userId)
        shell.retry()
      }}
    >
      qa-switch-role
    </button>
  )
}

describe('AC-59 — "Switching the acting user re-derives the rail and sub-tab list, and does not navigate away from a route that remains permitted"', () => {
  it('re-derives identity without moving the operator off the current route', async () => {
    const user = userEvent.setup()
    await switchMockUser('USR-1')
    renderShell('/operations/people', <RoleSwitcher userId="USR-4" />)
    await screen.findByText('screen: operations-people')

    await user.click(screen.getByRole('button', { name: 'qa-switch-role' }))

    /* The route is unchanged and still highlighted — no silent redirect. */
    await waitFor(() =>
      expect(screen.getByRole('link', { name: rowName(en('subtab.operations.people')) })).toHaveAttribute(
        'aria-current',
        'page',
      ),
    )
    expect(screen.getByText('screen: operations-people')).toBeInTheDocument()
    /**
     * **And the rail is RE-DERIVED — which this assertion could not show until
     * D17.** Edited by mock-data-engineer on the D17 pass; owner: qa-engineer.
     *
     * It used to expect 5, and it passed, because every route-table row carried
     * `permission: null` and the rail was five tiles for everybody. Owner → a
     * Support operator was 5 → 5 and the criterion's own verb — *"re-derives"* —
     * was unobservable.
     *
     * Under D17 the Support baseline is `view_operations`, `view_support`,
     * `view_profiles`, `manage_tickets`, `contact_users`: **no `view_analytics`
     * and no `view_finance`**, so Management and Financials do not render, and
     * Admin survives on the Activity Log alone. 5 → 3, and the number changing
     * is the evidence.
     *
     * The Owner half of the pair is asserted above and in `permissions.test.ts`.
     */
    const rail = screen.getByRole('navigation', { name: railName() })
    const tiles = within(rail)
      .getAllByRole('link')
      .filter((l) => l.getAttribute('aria-label') !== 'Eyvar')
    expect(tiles).toHaveLength(3)
  })
})


/* ══════ D5 — what replaces AC-32 and AC-33: the column never collapses ═════

   **Round 2. AC-32 and AC-33 are VOID** — `DECISIONS.md` D5 removed the sub-tab
   collapse outright, and `specs/00-foundation.md` records both criteria struck
   with the replacement stated. So the seven tests that stood here in round 1 —
   four for AC-32's viewport default and resize rule, three for AC-33's popover
   and its Q1 reload gap — are **not restored**. They tested a requirement that
   no longer exists, and restoring them would be re-litigating a decision.

   What follows is the coverage that replaces them, one test per surviving
   claim. Between them they close the same seven holes from the other side:

     was AC-32 (1280 default)        → the column is present at 1280
     was AC-32 (1440 default)        → the column is present at 1440
     was AC-32 (no re-collapse)      → narrowing changes nothing
     was AC-32 (no re-expand)        → widening changes nothing
     was AC-32 (survives navigation) → present on all 34 routes
     was AC-33 (popover = same rows) → there is no disclosure and no popover
     was AC-33 (Q1 reload gap)       → nothing about the column is persisted,
                                       so no shell criterion waits on Q1

   The last one is the point of the whole decision and it is worth stating in a
   test rather than only in prose: **the shell's one failing criterion was
   removed by deleting the feature that failed, not by answering Q1.**       */

describe('D5 (replacing AC-32 / AC-33) — "the level-2 column is always visible"', () => {
  /** The column, identified by its own landmark name, never by a class. */
  const column = () =>
    screen.queryByRole('navigation', {
      name: (en('shell.nav.subTabsFor') as string).replace(
        '{workspace}',
        en('workspace.operations'),
      ),
    })

  it('renders the sub-tab column at the 1280 floor, where AC-32 used to default it collapsed', async () => {
    setViewport(1280)
    renderShell('/operations/people')
    await screen.findByRole('main')
    expect(column()).toBeInTheDocument()
    expect(within(column()!).getAllByRole('link')).toHaveLength(
      table.subTabs.filter((r) => r.workspaceId === 'operations').length,
    )
  })

  it('renders the sub-tab column at 1440, identically — there are no longer two states', async () => {
    setViewport(1440)
    renderShell('/operations/people')
    await screen.findByRole('main')
    expect(column()).toBeInTheDocument()
    expect(within(column()!).getAllByRole('link')).toHaveLength(
      table.subTabs.filter((r) => r.workspaceId === 'operations').length,
    )
  })

  /**
   * These two are deliberately in TWO parts, because a one-part version does
   * not bite. Mutation-checked: reintroducing the collapse as a render-time
   * `window.innerWidth >= 1344 &&` guard in `AppLayout` survives a bare resize
   * event, since nothing subscribes to one and React does not re-render. So
   * each test resizes AND then forces a real re-render by navigating, which is
   * the path an operator actually takes.
   */
  it('does not hide the column when the window is narrowed across the breakpoint', async () => {
    const user = userEvent.setup()
    setViewport(1440)
    renderShell('/operations/people')
    await screen.findByRole('main')
    const before = column()

    setViewport(1280)
    window.dispatchEvent(new Event('resize'))
    /* §3.3's "the one thing not to get wrong" survives D5 in a stronger form:
       there is no state to re-derive, so a resize cannot re-derive one. Node
       identity is the assertion — a re-mount would fail it too. */
    await waitFor(() => expect(column()).toBe(before))

    /* …and it is still there after the next render at the narrow width. */
    await user.click(screen.getByRole('link', { name: rowName(en('subtab.operations.trips')) }))
    await screen.findByText('screen: operations-trips')
    expect(column()).toBeInTheDocument()
  })

  it('does not change the column when the window is widened across the breakpoint', async () => {
    const user = userEvent.setup()
    setViewport(1280)
    renderShell('/operations/people')
    await screen.findByRole('main')
    const before = column()

    setViewport(1440)
    window.dispatchEvent(new Event('resize'))
    await waitFor(() => expect(column()).toBe(before))

    await user.click(screen.getByRole('link', { name: rowName(en('subtab.operations.trips')) }))
    await screen.findByText('screen: operations-trips')
    expect(column()).toBeInTheDocument()
  })

  it('keeps the column on every one of the 34 sub-tab routes, at the 1280 floor', async () => {
    /* At 1280 rather than 1440, so this also defends against a render-time
       viewport read reappearing in `AppLayout` — see the mutation note above. */
    setViewport(1280)
    for (const row of table.subTabs) {
      const view = renderShell(row.path)
      await screen.findByRole('main')
      const workspace = table.workspaces.find((w) => w.id === row.workspaceId)!
      expect(
        screen.getByRole('navigation', {
          name: (en('shell.nav.subTabsFor') as string).replace(
            '{workspace}',
            en(workspace.titleKey),
          ),
        }),
        row.path,
      ).toBeInTheDocument()
      view.unmount()
    }
  })

  it('offers no disclosure and opens no sub-tab popover — there is nothing to collapse it with', async () => {
    const user = userEvent.setup()
    renderShell('/operations/people')
    await screen.findByRole('main')

    /* The rail is where §3.9 put the disclosure, and F-3 argued about where in
       the rail. Both go with it: the rail holds no button at all. */
    const rail = screen.getByRole('navigation', { name: railName() })
    expect(rail.querySelectorAll('button')).toHaveLength(0)
    expect(column()!.querySelectorAll('button')).toHaveLength(0)

    /* Named lookups too, because the two strings are still in the dictionary —
       see the dead-key finding in the verdict — and a control could be
       reintroduced without changing any class. */
    expect(screen.queryByRole('button', { name: en('shell.nav.hideSubTabs') })).toBeNull()
    expect(screen.queryByRole('button', { name: en('shell.nav.showSubTabs') })).toBeNull()

    /* And no dialog is reachable from either nav column. The account layer and
       the bell popover are top-bar surfaces and are tested under AC-66. */
    expect(screen.queryByRole('dialog')).toBeNull()
    await user.click(within(rail).getAllByRole('link')[1]!)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('persists nothing about the column, so no shell criterion waits on Q1 any more', async () => {
    /* AC-33's second clause was the shell's ONLY failing criterion and it
       failed on Q1 (what survives a reload). It is gone because the thing that
       needed persisting is gone — asserted here in both directions. */
    expect(Object.values(UI_STATE_KEYS).some((k) => /collaps/i.test(k))).toBe(false)

    const view = renderShell('/operations/people')
    await screen.findByRole('main')
    expect(column()).toBeInTheDocument()
    view.unmount()

    /* `resetDefaultUiStores()` is precisely what a reload does to an in-memory
       store. In round 1 this is where the operator's choice was lost. Now
       there is no choice to lose: the column comes back either way. */
    resetDefaultUiStores()
    renderShell('/operations/people')
    await screen.findByRole('main')
    expect(column()).toBeInTheDocument()
  })
})

describe('AC-19 — "The rail, the sub-tab list and the content region scroll independently"', () => {
  it('gives each region its own scroll container, none an ancestor of another', async () => {
    renderShell('/operations/people')
    const rail = await screen.findByRole('navigation', { name: railName() })
    const column = screen.getByRole('heading', { level: 2 }).closest('nav')!
    const main = screen.getByRole('main')

    /* jsdom has no layout, so a real scroll offset cannot be measured — that
       measurement is visual-QA's. What IS checkable here is the structural
       precondition: three sibling scroll contexts, and an outer frame that
       cannot scroll them together. */
    for (const [a, b] of [
      [rail, column],
      [rail, main],
      [column, main],
    ] as const) {
      expect(a.contains(b)).toBe(false)
      expect(b.contains(a)).toBe(false)
    }
    expect(main.className).toContain('overflow-y-auto')
    expect(rail.className).toContain('overflow-hidden')
    expect(column.querySelector('[data-slot="scroll-area"]')).not.toBeNull()

    const frame = document.querySelector('.h-screen') as HTMLElement | null
    expect(frame).not.toBeNull()
    expect(frame!.className).toContain('overflow-hidden')
  })
})
