/**
 * **The notification centre's four defects, one `describe` each.**
 *
 * Every one of these is a surface that rendered fine and told the operator
 * something false, which is why none of them had a test.
 *
 *   1. The one seeded end-to-end alert opened a **dead overlay**. `entityId`
 *      beat `route` unconditionally, and `ALR-1` is not a profile entity, so
 *      `ProfileLayer` rendered its not-found naming an id nobody can act on —
 *      while the correct destination sat unused on the same row.
 *   2. Three **untranslated English strings** on a shell surface: the filter
 *      chips rendered the raw `NotificationFilter` id, the tier headings the
 *      raw `NotificationPriority` id under a CSS `capitalize` that does nothing
 *      in Arabic, and the bell chip a hardcoded `${unread} new` with an
 *      unformatted numeral.
 *   3. `markNotificationRead` was reachable **only through navigation**, so a
 *      notification with no destination could never be marked read at all.
 *   4. `Mark all as read` named no count and sat **enabled over zero unread**.
 *
 * Each test asserts the consequence — where the operator landed, what word is
 * on screen, what the badge says afterwards — never that a handler fired.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import {
  disableMockLatency,
  getNotificationSummary,
  getRouteTable,
  listNotifications,
  mockFailures,
  resetDataLayer,
} from '@/data/clients'
import { formatCount, resetDefaultUiStores } from '@/lib'
import { EN } from '@/i18n/dictionaries'
import { AppLayout } from './AppLayout'
import { ShellProvider } from './ShellContext'
import { NotFoundScreen } from '@/screens/RouteStates'

const table = getRouteTable()
const en = (key: string) => EN[key] as string
const escapeForRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

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
      </ShellProvider>
    </MemoryRouter>,
  )
}

/** The layer, opened the way a deep link opens it. */
const LAYER_PATH = '/operations/overview?notifications=all'
const path = () => screen.getByTestId('path').textContent ?? ''

/**
 * The row's own body button, not the `Mark as read` beside it — both carry the
 * title in their accessible name, which is deliberate: the action names the row
 * it acts on (§7.2). The body button is the one with no `aria-label`.
 */
function rowButton(layer: HTMLElement, title: string) {
  const matches = within(layer)
    .getAllByRole('button', { name: new RegExp(escapeForRegExp(title)) })
    .filter((each) => each.getAttribute('aria-label') === null)
  expect(matches, `one navigable row for ${title}`).toHaveLength(1)
  return matches[0]!
}

async function notification(id: string) {
  const page = await listNotifications({ filter: 'all', pageSize: 50 })
  const found = page.items.find((each) => each.id === id)
  if (!found) throw new Error(`no notification ${id}`)
  return found
}

/* ═══════════ 1 · the alert notification lands somewhere real ═══════════ */

describe('an alert notification opens the report that fired, not a not-found overlay', () => {
  it('follows `route` when `entityType` is not a profile entity', async () => {
    const user = userEvent.setup()
    const alert = await notification('N11')
    expect(alert.route, 'the fixture must keep its destination').not.toBeNull()
    expect(alert.entityId, 'the reconciliation key stays on the row').toBe('ALR-1')

    renderShell(LAYER_PATH)
    const layer = await screen.findByRole('dialog')
    await user.click(rowButton(layer, alert.title))

    await waitFor(() => {
      /* Where the rule's own report lives, at the window it evaluated. */
      expect(path()).toContain(alert.route!.split('?')[0])
    })
    /* And NOT into `?entity=ALR-1`, which `clients/profile.ts` cannot resolve
       and would render as "no record found" naming an id nobody can act on. */
    expect(path()).not.toContain('entity=')
  })

  it('still opens the profile overlay for an id that IS a profile entity', async () => {
    const user = userEvent.setup()
    const ticket = await notification('N2')
    expect(ticket.entityType).toBe('ticket')

    renderShell(LAYER_PATH)
    const layer = await screen.findByRole('dialog')
    await user.click(rowButton(layer, ticket.title))

    await waitFor(() => expect(path()).toContain(`entity=${ticket.entityId}`))
  })
})

/* ═══════════ 2 · nothing on this surface renders a raw id ══════════════ */

describe('the filter chips and the tier headings are translated', () => {
  it('renders the words, never the `NotificationFilter` ids', async () => {
    renderShell(LAYER_PATH)
    const layer = await screen.findByRole('dialog')

    for (const [id, key] of [
      ['all', 'shell.notifications.filter.all'],
      ['unread', 'shell.notifications.filter.unread'],
      ['alert', 'shell.notifications.filter.alert'],
      ['ticket', 'shell.notifications.filter.ticket'],
      ['payout', 'shell.notifications.filter.payout'],
      ['renewal', 'shell.notifications.filter.renewal'],
    ] as const) {
      expect(within(layer).getByRole('button', { name: en(key) })).toBeInTheDocument()
      /* The raw id is what used to render. An exact-name query is the only
         kind that can tell `alert` apart from `Alerts`. */
      expect(within(layer).queryByRole('button', { name: id })).toBeNull()
    }
  })

  it('renders the tier headings as words, with no `capitalize` doing the work', async () => {
    renderShell(LAYER_PATH)
    const layer = await screen.findByRole('dialog')

    const critical = await within(layer).findByRole('heading', {
      name: en('shell.notifications.tier.critical'),
    })
    expect(critical).toBeInTheDocument()
    /* `capitalize` is a no-op in Arabic and was carrying the whole word. */
    expect(critical.className).not.toContain('capitalize')
    expect(within(layer).queryByRole('heading', { name: 'critical' })).toBeNull()
  })
})

/* ═══════════ 3 · read state is reversible without navigating ═══════════ */

describe('an unread row can be marked read without going anywhere', () => {
  it('decrements the badge and leaves the operator on the same route', async () => {
    const user = userEvent.setup()
    const before = await getNotificationSummary()
    expect(before.unread).toBeGreaterThan(0)
    const target = (await listNotifications({ filter: 'unread', pageSize: 50 })).items[0]!

    renderShell(LAYER_PATH)
    const layer = await screen.findByRole('dialog')
    const control = within(layer).getByRole('button', {
      name: en('shell.notifications.markReadA11y').replace('{title}', target.title),
    })
    /* §7.3 — in the DOM because the row is unread, not because a pointer is
       over it. Nothing has been hovered at this point. */
    expect(control).toBeVisible()
    await user.click(control)

    await waitFor(async () => {
      expect((await getNotificationSummary()).unread).toBe(before.unread - 1)
    })
    /* The whole point: no navigation happened. */
    expect(path()).toContain('/operations/overview')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('offers the control on every unread row and on no read row', async () => {
    renderShell(LAYER_PATH)
    const layer = await screen.findByRole('dialog')
    const page = await listNotifications({ filter: 'all', pageSize: 50 })

    for (const each of page.items) {
      const name = en('shell.notifications.markReadA11y').replace('{title}', each.title)
      const control = within(layer).queryByRole('button', { name })
      if (each.read) expect(control, `${each.id} is read`).toBeNull()
      else expect(control, `${each.id} is unread`).not.toBeNull()
    }
  })
})

/* ═══════════ 4 · the bulk action counts, and disables at zero ══════════ */

describe('`Mark all as read` names the count and is disabled at zero', () => {
  it('states how many are left, then renders disabled rather than hidden', async () => {
    const user = userEvent.setup()
    const before = await getNotificationSummary()

    renderShell(LAYER_PATH)
    const layer = await screen.findByRole('dialog')
    const bulk = within(layer).getByRole('button', {
      name: en('shell.notifications.markAllReadCount').replace(
        '{count}',
        formatCount(before.unread, 'en'),
      ),
    })
    expect(bulk).toBeEnabled()

    await user.click(bulk)

    /* §11.2 — disabled IN PLACE. It is still on screen, still says what it
       does, and now reads zero. */
    await waitFor(() =>
      expect(
        within(screen.getByRole('dialog')).getByRole('button', {
          name: en('shell.notifications.markAllReadCount').replace(
            '{count}',
            formatCount(0, 'en'),
          ),
        }),
      ).toBeDisabled(),
    )
  })
})

/* ═══════════ 5 · the unread marker carries a word ══════════════════════ */

describe('the unread marker is not colour and shape alone', () => {
  it('names itself on the bell row (§7.5)', async () => {
    const user = userEvent.setup()
    const target = (await listNotifications({ filter: 'unread', pageSize: 50 })).items[0]!

    renderShell('/operations/overview')
    await user.click(await screen.findByRole('button', { name: en('shell.topbar.notifications') }))

    const row = await screen.findByRole('button', {
      name: new RegExp(escapeForRegExp(target.title)),
    })
    expect(row).toHaveAccessibleName(
      new RegExp(escapeForRegExp(en('shell.notifications.unread'))),
    )
  })
})
