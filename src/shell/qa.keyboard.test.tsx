/**
 * **QA (0.8) — keyboard and accessibility criteria: AC-62 … AC-68.**
 *
 * Written by qa-engineer. These are the criteria that are invisible in a
 * screenshot and are the first thing a refactor breaks, so each one is asserted
 * against the DOM the operator actually drives, not against a hook in
 * isolation. `src/hooks/useFocusEntry.test.ts` already proves the HOOK behaves;
 * what is unproven — and what AC-66 and AC-67 are actually about — is whether
 * the SHELL LAYER wired to it behaves.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { disableMockLatency, getRouteTable, resetDataLayer } from '@/data/clients'
import { createTranslator, resetDefaultUiStores } from '@/lib'
import { EN } from '@/i18n/dictionaries'
import { AppLayout } from './AppLayout'
import { ShellProvider } from './ShellContext'
import { ShellLayer } from './ShellLayer'

const table = getRouteTable()
const en = (key: string) => EN[key] as string
const t = createTranslator({ dictionary: EN, fallback: EN })

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
  resetDefaultUiStores()
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1440 })
})

afterEach(() => {
  document.documentElement.removeAttribute('dir')
  document.documentElement.removeAttribute('lang')
})

function renderShell(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShellProvider>
        <Routes>
          <Route element={<AppLayout />}>
            {table.subTabs.map((row) => (
              <Route
                key={row.path}
                path={row.path}
                element={
                  <div>
                    <button>content-button</button>
                  </div>
                }
              />
            ))}
          </Route>
        </Routes>
      </ShellProvider>
    </MemoryRouter>,
  )
}

/** The accessible name of whatever currently has focus. */
function focusedName(): string {
  const el = document.activeElement
  if (!el) return 'none'
  return (el.getAttribute('aria-label') ?? el.textContent ?? '').trim()
}

/* ════════════════════════════════ AC-62 ═════════════════════════════════ */

describe('AC-62 — "The first Tab from the document body focuses a visible Skip to content link; activating it moves focus into the content region"', () => {
  it('is the first Tab stop and it becomes visible on focus, not merely reachable', async () => {
    const user = userEvent.setup()
    renderShell('/operations/people')
    await screen.findByRole('main')
    await user.tab()
    const link = screen.getByRole('link', { name: en('shell.skipToContent') })
    expect(document.activeElement).toBe(link)
    /* `sr-only` alone would fail the criterion — the link must UN-hide under
       focus. The class list is the only handle jsdom gives for that, and it is
       recorded as a measurement visual-QA must confirm at pixel level. */
    expect(link.className).toContain('focus-visible:not-sr-only')
  })

  it('moves focus into the content region when activated', async () => {
    const user = userEvent.setup()
    renderShell('/operations/people')
    const main = await screen.findByRole('main')
    await user.tab()
    /* jsdom does not implement fragment-navigation focus, so drive the contract
       the link declares: its href IS the landmark, and the landmark accepts
       programmatic focus with a visible ring (no `outline-hidden` on it). */
    expect(screen.getByRole('link', { name: en('shell.skipToContent') })).toHaveAttribute(
      'href',
      `#${main.id}`,
    )
    expect(main).toHaveAttribute('tabindex', '-1')
    expect(main.className).not.toContain('outline-hidden')
    main.focus()
    expect(document.activeElement).toBe(main)
  })
})

/* ════════════════════════════════ AC-64 ═════════════════════════════════ */

describe('AC-64 (amended) — "the rail\'s four workspace tiles → the sub-tab disclosure → the pinned Admin tile → the sub-tab list → top bar → content"', () => {
  it('produces exactly that order from the document body, end to end', async () => {
    const user = userEvent.setup()
    renderShell('/operations/people')
    await screen.findByRole('main')

    const order: string[] = []
    for (let i = 0; i < 12; i += 1) {
      await user.tab()
      order.push(focusedName())
    }

    expect(order.slice(0, 7)).toEqual([
      en('shell.skipToContent'),
      /* §4.1 puts the Eyvar wordmark in the rail, so it is a real tab stop.
         AC-64 does not enumerate it; recorded as a spec gap, not a defect,
         because visual order, DOM order and tab order still agree (§7.3). */
      'Eyvar',
      en('workspace.management'),
      en('shell.nav.hideSubTabs'),
      en('workspace.admin'),
      /* The sub-tab list is ONE stop, landing on its first row. */
      en('subtab.operations.overview'),
      /* …then the top bar. */
      en('shell.topbar.search'),
    ])

    /* …and the content region is reached after the top bar's four slots. */
    expect(order).toContain('content-button')
    expect(order.indexOf('content-button')).toBeGreaterThan(
      order.indexOf(en('shell.topbar.account')),
    )
  })

  it('keeps the disclosure in the SAME tab position when the column collapses (§3.9)', async () => {
    const user = userEvent.setup()
    renderShell('/operations/people')
    await screen.findByRole('main')

    await user.click(screen.getByRole('button', { name: en('shell.nav.hideSubTabs') }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: en('shell.nav.showSubTabs') })).toBeInTheDocument(),
    )

    const order: string[] = []
    document.body.focus()
    for (let i = 0; i < 5; i += 1) {
      await user.tab()
      order.push(focusedName())
    }
    /* Position 4 is the disclosure in BOTH states — that is the whole reason
       §3.9 puts it in the rail rather than "in the column's place". */
    expect(order.slice(0, 5)).toEqual([
      en('shell.skipToContent'),
      'Eyvar',
      en('workspace.management'),
      en('shell.nav.showSubTabs'),
      en('workspace.admin'),
    ])
  })

  it('moves within the rail with arrow keys and between the columns with Tab', async () => {
    const user = userEvent.setup()
    renderShell('/operations/people')
    await screen.findByRole('main')

    screen.getByRole('link', { name: en('workspace.management') }).focus()
    await user.keyboard('{ArrowDown}')
    expect(focusedName()).toBe(en('workspace.operations'))
    await user.keyboard('{ArrowDown}')
    expect(focusedName()).toBe(en('workspace.financials'))
    await user.tab()
    expect(focusedName()).toBe(en('shell.nav.hideSubTabs'))
  })
})

/* ════════════════════════════════ AC-65 ═════════════════════════════════ */

describe('AC-65 — "Every icon-only control in the shell has an accessible name"', () => {
  it('names the five rail tiles, the bell, the avatar and the collapse control', async () => {
    renderShell('/operations/people')
    await screen.findByRole('main')

    for (const workspace of table.workspaces) {
      expect(
        screen.getByRole('link', { name: en(workspace.titleKey) }),
        workspace.id,
      ).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: en('shell.nav.hideSubTabs') })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: en('shell.topbar.notifications') })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: en('shell.topbar.account') })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: en('shell.topbar.search') })).toBeInTheDocument()
    /* The wordmark is icon-only too, and it is a link. */
    expect(screen.getByRole('link', { name: 'Eyvar' })).toBeInTheDocument()
  })

  it('names the back arrow on a level-3 detail route', async () => {
    render(
      <MemoryRouter initialEntries={['/operations/people/applications/APP-2201']}>
        <ShellProvider>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/operations/people/applications/:applicantId" element={<div>detail</div>} />
            </Route>
          </Routes>
        </ShellProvider>
      </MemoryRouter>,
    )
    expect(
      await screen.findByRole('button', { name: en('shell.topbar.back') }),
    ).toBeInTheDocument()
  })

  it('leaves no button or link in the shell chrome without an accessible name', async () => {
    renderShell('/operations/people')
    await screen.findByRole('main')
    const chrome = [
      screen.getByRole('navigation', { name: en('shell.nav.workspaces') }),
      screen.getByRole('banner'),
    ]
    for (const region of chrome) {
      for (const el of region.querySelectorAll('a, button, input')) {
        const name =
          el.getAttribute('aria-label') ??
          (el.textContent ?? '').trim() ??
          el.getAttribute('title')
        expect(name, el.outerHTML.slice(0, 120)).toBeTruthy()
      }
    }
  })
})

/* ══════════════════════════ AC-66 and AC-67 ═════════════════════════════ */

describe('AC-66 — "Escape closes the open shell layer, any menu, any sheet and any modal, and returns focus to the control that opened it"', () => {
  it('closes the account menu on Escape and returns focus to the avatar', async () => {
    const user = userEvent.setup()
    renderShell('/operations/people')
    await screen.findByRole('main')
    const avatar = screen.getByRole('button', { name: en('shell.topbar.account') })
    await user.click(avatar)
    expect(await screen.findByRole('menu')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
    expect(document.activeElement).toBe(avatar)
  })

  it('closes the notification popover on Escape and returns focus to the bell', async () => {
    const user = userEvent.setup()
    renderShell('/operations/people')
    await screen.findByRole('main')
    const bell = screen.getByRole('button', { name: en('shell.topbar.notifications') })
    await user.click(bell)
    await screen.findByText(en('shell.notifications.title'))
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByText(en('shell.notifications.title'))).toBeNull())
    expect(document.activeElement).toBe(bell)
  })

  it('closes the collapsed sub-tab popover on Escape and returns focus to the disclosure', async () => {
    const user = userEvent.setup()
    renderShell('/operations/people')
    await screen.findByRole('main')
    await user.click(screen.getByRole('button', { name: en('shell.nav.hideSubTabs') }))
    const disclosure = await screen.findByRole('button', { name: en('shell.nav.showSubTabs') })
    await user.click(disclosure)
    await screen.findByRole('dialog')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(disclosure)
  })

  it('closes the shell layer on Escape', async () => {
    const user = userEvent.setup()
    renderShell('/operations/people?account=me')
    await screen.findByRole('dialog')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
})

describe('AC-67 (amended) — "Opening a shell layer moves focus into it … Focus is NOT trapped"', () => {
  /**
   * **DEFECT D-1.** `it.fails` records a criterion that is FALSE TODAY. It
   * passes only while the behaviour is broken, and turns red the moment the
   * defect is fixed — at which point delete the `.fails` and keep the body.
   *
   * Root cause: Radix's `Portal` mounts its children in a SECOND commit (it
   * sets `mounted` in a layout effect), so when `ShellLayer`'s `useFocusEntry`
   * effect runs, `containerRef.current` and `initialFocusRef.current` are both
   * still `null`. The effect's deps are all stable refs, so it never re-runs
   * and focus never enters the layer.
   */
  it.fails('DEFECT D-1 — opening a shell layer does NOT move focus into it', async () => {
    render(
      <ShellLayer open onClose={() => undefined} title="Rider 1041" t={t}>
        <button>inside the layer</button>
      </ShellLayer>,
    )
    const dialog = await screen.findByRole('dialog')
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement))
  })

  it('DEFECT D-1 — the same, opened from a real control: focus stays on the opener', async () => {
    const user = userEvent.setup()
    renderShell('/operations/people')
    await screen.findByRole('main')

    const bell = screen.getByRole('button', { name: en('shell.topbar.notifications') })
    await user.click(bell)
    await user.click(await screen.findByRole('button', { name: en('shell.notifications.seeAll') }))
    const dialog = await screen.findByRole('dialog')

    /* What SHOULD hold: focus is inside `dialog`. What DOES hold: */
    expect(dialog.contains(document.activeElement)).toBe(false)
  })

  /**
   * **DEFECT D-2 — the layer TRAPS focus, which the amended AC-67 makes a
   * defect rather than a pass.**
   *
   * `sheet.tsx` sets Radix `modal={false}`, which turns off `trapped`. But
   * `@radix-ui/react-dialog` hardcodes `loop: true` on its `FocusScope`
   * (`dist/index.mjs:223`), and `FocusScope`'s `handleKeyDown` runs when
   * `loop || trapped` (`react-focus-scope/dist/index.mjs:109`): Tab on the
   * last tabbable inside the container is `preventDefault()`-ed and looped
   * back to the first. `modal={false}` does not switch that off.
   *
   * Net effect: focus can ENTER the drawer from the page (it is DOM-last) but
   * can never LEAVE it with `Tab`. A keyboard operator who reaches the 360°
   * profile cannot get back to the queue behind it without `Escape`, which
   * closes the layer they were reading against — the exact workflow §5.5 and
   * §7.3.3 removed the scrim to preserve.
   *
   * `src/hooks/useFocusEntry.test.ts` proves the HOOK installs no trap. It
   * does not, and cannot, prove the SHELL LAYER is untrapped, because the trap
   * arrives from the component the hook composes with.
   */
  it.fails(
    'DEFECT D-2 — Tab past the layer\'s last control does NOT move into the page behind it',
    async () => {
      const user = userEvent.setup()
      renderShell('/operations/people?account=me')
      const dialog = await screen.findByRole('dialog')
      const inside = within(dialog).getAllByRole('button')
      expect(inside.length).toBeGreaterThan(0)

      /* Enter the layer by hand, since D-1 means opening does not. */
      inside[inside.length - 1]!.focus()
      const visited: boolean[] = []
      for (let i = 0; i < 20; i += 1) {
        await user.tab()
        visited.push(dialog.contains(document.activeElement))
      }
      /* Focus leaves the layer — a trap makes every entry `true`. */
      expect(visited).toContain(false)
    },
  )

  it('DEFECT D-2 — focus loops back to the layer\'s FIRST control instead, and the layer stays open', async () => {
    const user = userEvent.setup()
    renderShell('/operations/people?account=me')
    const dialog = await screen.findByRole('dialog')
    const inside = within(dialog).getAllByRole('button')
    const first = inside[0]!
    const last = inside[inside.length - 1]!

    last.focus()
    await user.tab()
    /* This is the observed behaviour, recorded so the fix has a target. */
    expect(document.activeElement).toBe(first)
    expect(dialog.contains(document.activeElement)).toBe(true)
    /* Shift+Tab from the first wraps to the last, the same trap backwards. */
    first.focus()
    await user.tab({ shift: true })
    expect(document.activeElement).toBe(last)
    /* The layer does stay open, which is the one half of AC-67 that holds. */
    expect(screen.getByRole('dialog')).toBe(dialog)
  })

  it('does NOT hide the page behind the layer from assistive technology', async () => {
    renderShell('/operations/people?account=me')
    await screen.findByRole('dialog')
    /* A trap's usual companion is `aria-hidden` on the rest of the document.
       §5.5's no-scrim layers must not do it: the operator reads the profile
       WHILE working the queue behind it. */
    const rail = screen.getByRole('navigation', { name: en('shell.nav.workspaces') })
    expect(rail).not.toHaveAttribute('aria-hidden')
    expect(rail.closest('[aria-hidden="true"]')).toBeNull()
    expect(rail.closest('[inert]')).toBeNull()
  })

  it('leaves the page behind interactive while the layer is open (AC-20)', async () => {
    const user = userEvent.setup()
    renderShell('/operations/people?account=me')
    await screen.findByRole('dialog')
    await user.click(screen.getByRole('link', { name: en('workspace.financials') }))
    expect(screen.getByRole('link', { name: en('workspace.financials') })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })
})

/* ════════════════════════════════ AC-63 ═════════════════════════════════ */

describe('AC-63 — "Every rail tile and every sub-tab row is reachable by keyboard and shows a visible focus indicator"', () => {
  it('reaches all five rail tiles and all nine Operations rows with the keyboard alone', async () => {
    const user = userEvent.setup()
    renderShell('/operations/people')
    await screen.findByRole('main')

    /* The rail: one Tab stop, then arrows through the group, then Admin. */
    screen.getByRole('link', { name: en('workspace.management') }).focus()
    const railSeen = [focusedName()]
    for (let i = 0; i < 3; i += 1) {
      await user.keyboard('{ArrowDown}')
      railSeen.push(focusedName())
    }
    await user.tab()
    await user.tab()
    railSeen.push(focusedName())
    expect(railSeen).toEqual(table.workspaces.map((w) => en(w.titleKey)))

    /* The column: one Tab stop, then arrows through all nine rows. */
    const rows = table.subTabs
      .filter((r) => r.workspaceId === 'operations')
      .sort((a, b) => a.order - b.order)
    await user.tab()
    const rowsSeen = [focusedName()]
    for (let i = 1; i < rows.length; i += 1) {
      await user.keyboard('{ArrowDown}')
      rowsSeen.push(focusedName())
    }
    /* **DEFECT D-3.** A row's accessible name is its label with its count
       badge glued straight onto it — `My Work12` — because the badge in the
       column carries no `aria-label` and no separator, unlike the rail tile's.
       Asserted by prefix so the criterion under test (reachability) is not
       masked by the naming defect. */
    expect(rowsSeen.map((n, i) => n.startsWith(en(rows[i]!.titleKey)))).toEqual(rows.map(() => true))
    expect(rowsSeen.some((n) => /\d/.test(n))).toBe(true)
  })

  it('DEFECT D-3 — a sub-tab row with a backlog announces its count with no label or separator', async () => {
    renderShell('/operations/people')
    await screen.findByRole('main')
    const withBadge = table.subTabs
      .filter((r) => r.workspaceId === 'operations')
      .map((r) => screen.queryAllByRole('link').find((l) => l.textContent?.startsWith(en(r.titleKey))))
      .filter((el): el is HTMLElement => Boolean(el))
      .find((el) => /\d$/.test((el.textContent ?? '').trim()))
    expect(withBadge, 'no Operations row currently carries a count').toBeDefined()
    /* What an operator on a screen reader hears today, e.g. `My Work12`. */
    expect((withBadge!.textContent ?? '').trim()).toMatch(/[a-z]\d+$/i)
    expect(withBadge!.querySelector('[data-slot="badge"]')).not.toHaveAttribute('aria-label')
  })

  it('DEFECT D-4 — the rail tile\'s count badge is announced to nobody', async () => {
    renderShell('/operations/people')
    await screen.findByRole('main')
    const tile = screen.getByRole('link', { name: en('workspace.operations') })
    const badge = tile.querySelector('[data-slot="badge"]')
    expect(badge, 'Operations has no tile badge in this fixture').not.toBeNull()
    /* The badge carries a good `aria-label` — but the TILE carries its own
       `aria-label`, which replaces the whole subtree in the accessible-name
       computation. So the count never reaches assistive technology, and when
       the column is collapsed it is the ONLY backlog signal there is (AC-27). */
    expect(badge).toHaveAttribute('aria-label')
    expect(tile).toHaveAttribute('aria-label', en('workspace.operations'))
    expect(tile.getAttribute('aria-label')).not.toMatch(/\d/)
  })

  it('sets no outline:none without a focus-visible replacement on any shell control', async () => {
    renderShell('/operations/people')
    await screen.findByRole('main')
    const regions = [
      screen.getByRole('navigation', { name: en('shell.nav.workspaces') }),
      screen.getByRole('banner'),
      screen.getByRole('heading', { level: 2 }).closest('nav')!,
    ]
    for (const region of regions) {
      for (const el of region.querySelectorAll('a, button, input')) {
        const classes = el.className.toString()
        if (!/\boutline-(hidden|none)\b/.test(classes)) continue
        /* The replacement may live on the element or on the wrapper that owns
           the ring — the global search input rings through its `focus-within`
           box, which is a legitimate §7.2 replacement. */
        const carriesRing = (node: Element | null): boolean => {
          while (node && node !== region.parentElement) {
            if (/focus-(visible|within):(ring|outline)/.test(node.className.toString())) return true
            node = node.parentElement
          }
          return false
        }
        expect(
          carriesRing(el),
          `${el.tagName} "${el.getAttribute('aria-label') ?? el.textContent}" kills its outline with no focus ring anywhere on its ancestry`,
        ).toBe(true)
      }
    }
  })
})
