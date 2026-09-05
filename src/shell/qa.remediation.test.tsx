/**
 * **The shell defects the second audit found, one `describe` each.**
 *
 * Every one of these is an *action that lied* rather than a screen that looked
 * wrong, which is why none of them had a test: the happy path rendered, and the
 * thing it claimed to do simply did not happen. So each test asserts the
 * consequence — the badge went down, the operator is a different person, the
 * sentence changed — and not that a handler was called.
 *
 *   1. `GlobalSearch` reported a **failed read** as *"no matches"*.
 *   2. `GlobalSearch`'s escape hatch dropped the query on a metric board.
 *   3. Opening a notification never marked it read, so the badge never moved.
 *   4. `Switch user` navigated to `/admin/team` instead of switching user.
 *   5. `AccountLayer` rendered 2 of 5 sections and a `Save` that was
 *      hardcoded `disabled` with no stated reason (**§11.2**).
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import {
  disableMockLatency,
  getNotificationSummary,
  getRouteTable,
  listTeamUsers,
  previewNotifications,
  mockFailures,
  resetDataLayer,
} from '@/data/clients'
import { resetDefaultUiStores } from '@/lib'
import { EN } from '@/i18n/dictionaries'
import { AppLayout } from './AppLayout'
import { PERMISSION_KEYS } from './permissions'
import { ShellProvider } from './ShellContext'
import { Toaster } from '@/components/ui/sonner'
import { NotFoundScreen } from '@/screens/RouteStates'

const table = getRouteTable()
const en = (key: string) => EN[key] as string

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
  resetDefaultUiStores()
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1440 })
})

afterEach(() => {
  mockFailures.clear()
  document.documentElement.removeAttribute('dir')
  document.documentElement.removeAttribute('lang')
})

/** Reports the live path, so a navigation assertion reads the URL and not a spy. */
function PathProbe() {
  const location = useLocation()
  return <span data-testid="path">{`${location.pathname}${location.search}`}</span>
}

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
        <PathProbe />
        <Toaster />
      </ShellProvider>
    </MemoryRouter>,
  )
}

/**
 * The palette is a centred modal (RULINGS, 2026-09-05): the top bar holds a
 * trigger and the query lives in the dialog's own input. The behaviour these
 * three tests assert is unchanged; only the door is.
 */
async function openSearch(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: en('command.trigger.label') }))
  return await screen.findByRole('searchbox', { name: en('shell.topbar.search') })
}

/* ════════════ 1 · a failed search is not "no matches" ══════════════════ */

describe('a search that fails says so, and does not report "no matches"', () => {
  it('renders the failure with a retry, and never the no-match sentence', async () => {
    const user = userEvent.setup()
    mockFailures.always('search.query')
    renderShell('/operations/overview')

    await user.type(await openSearch(user), 'Nora')

    /* The two are OPPOSITE instructions — one says the spelling is wrong, the
       other says nothing was asked. Only one of them may appear. */
    const failure = await screen.findByText(en('shell.search.error'))
    expect(failure).toBeInTheDocument()
    expect(screen.queryByText(/No matches for/i)).toBeNull()

    /* §11.2 — never a dead end. */
    expect(screen.getByRole('button', { name: en('shell.search.retry') })).toBeInTheDocument()
  })

  it('still says "no matches" when the read SUCCEEDS and matched nothing', async () => {
    const user = userEvent.setup()
    renderShell('/operations/overview')

    await user.type(await openSearch(user), 'zzzzqqqq')

    await waitFor(() => expect(screen.getByText(/No matches for/i)).toBeInTheDocument())
    expect(screen.queryByText(en('shell.search.error'))).toBeNull()
  })
})

/* ════════════ 2 · the escape hatch carries the query somewhere real ════ */

describe("the escape hatch goes to a screen that reads the operator's query", () => {
  it('navigates to an index route with `q` on it, not to a metric board that drops it', async () => {
    const user = userEvent.setup()
    renderShell('/operations/overview')

    await user.type(await openSearch(user), 'Al-Harbi')
    const hatch = await screen.findByText(/Search for "Al-Harbi"/)
    await user.click(hatch)

    await waitFor(() => {
      const path = screen.getByTestId('path').textContent ?? ''
      /* The query survives — that is the whole defect — and the destination is
         an index route, which is the only kind that reads it. */
      expect(path).toContain('q=Al-Harbi')
      expect(path).not.toContain('/operations/overview')
    })
  })
})

/* ════════════ 3 · opening a notification marks it read ═════════════════ */

describe('opening a notification marks it read, so the badge decrements', () => {
  it('reduces the unread count by one', async () => {
    const user = userEvent.setup()
    const before = await getNotificationSummary()
    expect(before.unread).toBeGreaterThan(0)

    /* A row is only a `<button>` when it has somewhere to go (§7.4), and only
       an UNREAD one can move the count. Pick that row from the client rather
       than from the DOM, so the test is not asserting against whichever row
       happens to be first. */
    const preview = await previewNotifications()
    const target = preview.find((each) => !each.read && (each.entityId !== null || each.route !== null))
    expect(target, 'the fixtures need one unread, navigable notification').toBeDefined()

    renderShell('/operations/overview')

    await user.click(await screen.findByRole('button', { name: en('shell.topbar.notifications') }))
    await user.click(
      await screen.findByRole('button', { name: new RegExp(escapeForRegExp(target!.title)) }),
    )

    await waitFor(async () => {
      const after = await getNotificationSummary()
      expect(after.unread).toBe(before.unread - 1)
    })
  })
})

/* ════════════ 4 · `Switch user` switches user ══════════════════════════ */

describe('`Switch user` switches the operator, and does not navigate to Team & Access', () => {
  it('signs the console in as the chosen operator and lands on their workspace', async () => {
    const user = userEvent.setup()
    const operators = await listTeamUsers()
    /* Somebody other than the signed-in fixture, and with a different landing
       workspace, so the assertion cannot pass by standing still. */
    const target = operators.find((each) => each.role === 'Finance')
    expect(target, 'the fixtures need a Finance operator').toBeDefined()

    renderShell('/operations/overview')

    await user.click(await screen.findByRole('button', { name: en('shell.topbar.account') }))
    await user.click(await screen.findByText(en('shell.account.switchUser')))

    /* **Keyboard, not a click, and that is not a workaround.** Radix's submenu
       items resolve a pointer selection through a `pointermove` sequence jsdom
       does not produce, so a `click` lands on the element and selects nothing.
       Keyboard is also the path §7.2 requires to work, so this is the stronger
       assertion of the two. */
    const row = await screen.findByRole('menuitemradio', { name: new RegExp(target!.name) })
    row.focus()
    await user.keyboard('{Enter}')

    /* The consequence, not the call: the session really is somebody else, and
       the console is on their workspace rather than on `/admin/team`. */
    await waitFor(() => {
      const path = screen.getByTestId('path').textContent ?? ''
      expect(path).toContain('/financials/')
      expect(path).not.toContain('/admin/team')
    })
    await waitFor(() =>
      expect(screen.getAllByText(new RegExp(target!.name)).length).toBeGreaterThan(0),
    )
  })
})

/* ════════════ 5 · the account layer's five sections and its Save ═══════ */

describe('the account layer renders five sections and no dead Save', () => {
  it('renders all five headings and none of them claims to have failed', async () => {
    renderShell('/operations/overview?account=me')

    for (const key of [
      'account.section.profile',
      'account.section.password',
      'account.section.twoFactor',
      /* `sessions` is `DeviceList`'s own card and its own heading — see the
         note in `AccountLayer`. One heading for one thing. */
      'auth.devices.title',
      'account.section.permissions',
    ]) {
      expect(await screen.findByRole('heading', { name: en(key) })).toBeInTheDocument()
    }

    /* The two that used to render `state.cardError.message` on a healthy load. */
    expect(screen.queryByText(/Couldn't load password/i)).toBeNull()
    expect(screen.queryByText(/Couldn't load twoFactor/i)).toBeNull()
  })

  it('shows the identity the session already carried — name, email and role', async () => {
    renderShell('/operations/overview?account=me')
    const profile = (await screen.findByRole('heading', { name: en('account.section.profile') }))
      .closest('section')
    expect(profile).not.toBeNull()
    expect(within(profile!).getByText(en('account.field.role'))).toBeInTheDocument()
    /* The email is the layer subtitle AND the profile card's second line; one
       of them is enough to prove it is no longer dropped. */
    expect(screen.getAllByText(/@/).length).toBeGreaterThan(0)
  })

  it('lists every permission in the model, each answered granted or withheld', async () => {
    renderShell('/operations/overview?account=me')
    const card = (await screen.findByRole('heading', { name: en('account.section.permissions') }))
      .closest('section')
    const rows = within(card!).getAllByRole('listitem')
    /* The whole set, not "the ones you hold". The signed-in fixture is the
       Owner, which is exactly the role for which a list of the held ones tells
       the operator nothing at all. The count comes from `PERMISSION_KEYS` and
       not from a literal, because D17 has already moved it once — 13 to 21 —
       and a literal here would have to be edited every time the model grows. */
    expect(rows).toHaveLength(PERMISSION_KEYS.length)
    for (const row of rows) {
      const answered =
        row.textContent?.includes(en('account.permission.granted')) === true ||
        row.textContent?.includes(en('account.permission.withheld')) === true
      expect(answered, row.textContent ?? '').toBe(true)
    }
  })

  it('gives the password section a Save that actually commits', async () => {
    const user = userEvent.setup()
    renderShell('/operations/overview?account=me')

    await user.click(await screen.findByRole('button', { name: en('account.action.password') }))
    const commit = await screen.findByRole('button', { name: en('account.password.send') })
    /* **The defect**: it was `<Button variant="default" disabled>` with nothing
       attached. It is enabled, and pressing it runs a real operation. */
    expect(commit).toBeEnabled()

    await user.click(commit)
    await waitFor(() => expect(screen.getByText(/Reset link sent to/i)).toBeInTheDocument())
  })

  it('refuses 2FA re-enrolment IN PLACE, with the reason as text (§11.2)', async () => {
    const user = userEvent.setup()
    renderShell('/operations/overview?account=me')

    await user.click(await screen.findByRole('button', { name: en('account.action.twoFactor') }))
    const commit = await screen.findByRole('button', { name: en('account.twoFactor.reenrol') })
    expect(commit).toBeDisabled()

    /* A disabled control with no reason is the defect. The reason is real text
       on the page, and the control points at it — not a tooltip (§5.7). */
    const reasonId = commit.getAttribute('aria-describedby')
    expect(reasonId).not.toBeNull()
    const reason = document.getElementById(reasonId!)
    expect(reason?.textContent).toBe(en('account.twoFactor.blocked'))
  })
})

/** A fixture title can hold a `.` or a `(`; a regex built from one must not. */
function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
