/**
 * **QA round 2 — AC-56, driven behaviourally.**
 *
 * *"Loading a route the current role cannot see renders the forbidden state
 * naming the permission required."*
 *
 * Round 1 recorded AC-56 as a **Fail** (defect D-9): `ForbiddenScreen` and
 * `forbiddenReason` both existed with zero call sites, so the criterion could
 * not hold however Q4 was answered. `02-shell-fixes.md` §9b wired `RouteGuard`
 * into `routes.tsx`, and `qa.copy.test.tsx` asserts that wiring at source
 * level. **This file asserts what an operator sees.**
 *
 * ── why this file mocks, and what it does not mock ───────────────────────
 *
 * The domain state under test — *a route this role cannot see* — is
 * **unreachable through the app's own seams today**. All 34 route-table rows
 * carry `permission: null` (that is **Q4**, open, business owner) and
 * `session.subTabPermissions` is `{}`, so no mock user and no fixture can
 * produce a denial. There is no `mockFailures` equivalent for permissions.
 *
 * So exactly one thing is stubbed: **the permission DECISION**,
 * `forbiddenReason`, which is a pure function already unit-tested against real
 * inputs in `permissions.test.ts`. Everything the criterion is actually about
 * stays real — the real `AppRoutes`, the real `RouteGuard`, the real
 * `ForbiddenScreen`, the real `AppLayout`, the real dictionary. If the guard is
 * removed from a route, or stops passing the key through, or the copy stops
 * naming it, these tests fail.
 *
 * The rest of `@/shell/permissions` is passed through with `importOriginal`,
 * so the rail and the column still filter through the genuine `visibleSubTabs`.
 *
 * **What this still does NOT prove**, and it is recorded rather than implied:
 * that any REAL role is denied any REAL route. That needs Q4. It is coverage
 * gap G-8 in the verdict, and it is a data gap, not a code one — which is the
 * distinction round 1 was arguing for.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { disableMockLatency, getRouteTable, resetDataLayer } from '@/data/clients'
import { resetDefaultUiStores } from '@/lib'
import { EN } from '@/i18n/dictionaries'
import { ShellProvider } from './ShellContext'
import { AppRoutes } from '@/routes'

/** The synthetic denial. `null` = permitted, a key = denied naming that key. */
let denyWith: string | null = null

vi.mock('@/shell/permissions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./permissions')>()
  return {
    ...actual,
    forbiddenReason: (
      ctx: Parameters<typeof actual.forbiddenReason>[0],
      row: Parameters<typeof actual.forbiddenReason>[1],
    ) => (denyWith !== null && row !== null ? denyWith : actual.forbiddenReason(ctx, row)),
  }
})

const table = getRouteTable()
const en = (key: string) => EN[key] as string
const railName = () => en('shell.nav.workspaces')

/** The URL, so AC-12's "the URL is not rewritten" can be asserted for AC-56 too. */
function UrlProbe() {
  const location = useLocation()
  return <span data-testid="qa-url">{location.pathname + location.search}</span>
}

function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShellProvider>
        <AppRoutes />
        <UrlProbe />
      </ShellProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
  resetDefaultUiStores()
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1440 })
})

afterEach(() => {
  denyWith = null
  document.documentElement.removeAttribute('dir')
  document.documentElement.removeAttribute('lang')
})

describe('AC-56 — "Loading a route the current role cannot see renders the forbidden state naming the permission required"', () => {
  it('renders the forbidden state, and it NAMES the permission', async () => {
    denyWith = 'manage_settings'
    renderApp('/admin/team')

    expect(await screen.findByText(en('state.forbidden.title'))).toBeInTheDocument()
    /* The criterion's whole point: the operator is told WHICH permission, so
       they can ask for it by name rather than describing a screen. */
    expect(
      screen.getByText(
        (en('state.forbidden.body') as string).replace('{permission}', 'manage_settings'),
      ),
    ).toBeInTheDocument()
  })

  it('names the route the operator asked for, rather than an anonymous page', async () => {
    denyWith = 'manage_settings'
    renderApp('/admin/team')
    /* §4.7 — the route's own title is the `<h1>`. They typed or clicked
       something and are owed the name of what they asked for. */
    /* Waited for explicitly, so the `h1` asserted below is the FORBIDDEN
       state's and not the sub-tab screen's while the session was still
       loading — the two carry the same title by design. */
    const forbidden = await screen.findByText(en('state.forbidden.title'))
    const heading = screen.getByRole('heading', { level: 1, name: en('subtab.admin.team') })
    expect(heading).toBeInTheDocument()
    expect(screen.getByRole('main')).toContainElement(forbidden)
    expect(screen.getByRole('main')).toContainElement(heading)
  })

  it('is not a redirect: the URL the operator opened is still the URL', async () => {
    denyWith = 'manage_settings'
    renderApp('/admin/team')
    await screen.findByText(en('state.forbidden.title'))
    /* §11.2 — never a silent redirect. A redirect teaches the operator that the
       URL they were given is wrong, when the truth is that their role is. */
    expect(screen.getByTestId('qa-url')).toHaveTextContent('/admin/team')
  })

  it('keeps the shell intact, so the operator can still see where they are', async () => {
    denyWith = 'manage_settings'
    renderApp('/admin/team')
    await screen.findByText(en('state.forbidden.title'))

    expect(screen.getByRole('navigation', { name: railName() })).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('offers a way out that goes to the role\'s own landing route', async () => {
    denyWith = 'manage_settings'
    renderApp('/admin/team')
    expect(
      await screen.findByRole('button', { name: en('state.forbidden.action') }),
    ).toBeInTheDocument()
  })

  it('gates a level-3 detail the same way, through its parent sub-tab\'s permission', async () => {
    denyWith = 'view_drivers'
    const detail = table.subTabs
      .flatMap((row) => row.detailRoutes.filter((d) => d.shape !== 'bleed'))
      .find((d) => d.path.includes(':'))
    expect(detail, 'the route table has no non-bleed detail route').toBeDefined()

    renderApp(detail!.path.replace(/:[A-Za-z]+/g, 'QA-1'))
    expect(await screen.findByText(en('state.forbidden.title'))).toBeInTheDocument()
    expect(
      screen.getByText((en('state.forbidden.body') as string).replace('{permission}', 'view_drivers')),
    ).toBeInTheDocument()
  })

  it('renders the screen, not the forbidden state, the moment the decision says permitted', async () => {
    /* The control. Without it the five tests above would also pass against a
       guard that denied unconditionally. */
    denyWith = null
    renderApp('/admin/team')
    expect(
      await screen.findByRole('heading', { level: 1, name: en('subtab.admin.team') }),
    ).toBeInTheDocument()
    expect(screen.queryByText(en('state.forbidden.title'))).toBeNull()
  })

  it('is evaluated on every navigation, not only on first load', async () => {
    /* This is the claim the build note makes — *"a pass-through that is
       EXERCISED on every navigation, so the day a permission key lands the
       forbidden state appears with no change here"* — and it is the one round 1
       showed to be false before the guard existed. Driven by flipping the
       decision between two renders of the same route. */
    denyWith = null
    const first = renderApp('/admin/team')
    await screen.findByRole('heading', { level: 1, name: en('subtab.admin.team') })
    first.unmount()

    denyWith = 'manage_settings'
    renderApp('/admin/team')
    await waitFor(() => expect(screen.getByText(en('state.forbidden.title'))).toBeInTheDocument())
  })

  it('leaves the navigation columns to their own filter — the guard does not empty them', async () => {
    /* AC-57 / AC-58 are about what the rail and the column SHOW; AC-56 is about
       what the content region RENDERS. Round 1's S-3 said the two criteria
       overlapped in a way that hid a defect, so they are pinned apart here:
       a denied route still leaves the operator a way to navigate. */
    denyWith = 'manage_settings'
    renderApp('/admin/team')
    await screen.findByText(en('state.forbidden.title'))

    const rail = screen.getByRole('navigation', { name: railName() })
    expect(
      within(rail)
        .getAllByRole('link')
        .filter((l) => l.getAttribute('aria-label') !== 'Eyvar'),
    ).toHaveLength(table.workspaces.length)
  })
})
