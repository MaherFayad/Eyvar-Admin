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

/**
 * A rough label for whatever currently has focus. **Not the accessible name** —
 * see `railName` below — so it is only ever used with a prefix comparison, or
 * for elements whose text and name coincide.
 */
function focusedName(): string {
  const el = document.activeElement
  if (!el) return 'none'
  return (el.getAttribute('aria-label') ?? el.textContent ?? '').trim()
}

/**
 * **Round 2 — D5: the rail tile's visible label IS its accessible name.**
 *
 * The labels are `Exec · Ops · Finance · Support · Admin`, and where a tile
 * carries a count badge the badge's own `aria-label` composes into the tile's
 * name — `Ops 35 items need attention` — because the tile no longer sets an
 * `aria-label` of its own (that was the fix for D-4). So the lookup is anchored
 * at the label and left open at the end. An exact-string match would break the
 * day a workspace gains or loses a backlog, which is data, not behaviour.
 *
 * The full names have **not** gone. `Operations` and `Customer Support` are the
 * sub-tab column's `<h2>`, and the assertions that read that heading still use
 * `workspace.*`. D5's point is that the rail no longer keeps two names for one
 * thing, not that the long name disappeared.
 */
const railLabel = (id: string) => en(`nav.rail.${id}`)
const railName = (id: string) => new RegExp(`^${railLabel(id)}\\b`)
const railTile = (id: string) => screen.getByRole('link', { name: railName(id) })

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

describe('AC-64 (amended, D5) — "the rail\'s four workspace tiles → the pinned Admin tile → the sub-tab list → top bar → content"', () => {
  it('produces exactly that order from the document body, end to end', async () => {
    const user = userEvent.setup()
    renderShell('/operations/people')
    const main = await screen.findByRole('main')

    /* Asserted as ELEMENTS, not as names. A tile's accessible name now carries
       its backlog count, so comparing name strings would make the tab order
       depend on the fixture's numbers. Identity does not. */
    const column = screen.getByRole('heading', { level: 2 }).closest('nav')!
    const expected: HTMLElement[] = [
      screen.getByRole('link', { name: en('shell.skipToContent') }),
      /* §4.1 puts the Eyvar wordmark in the rail, so it is a real tab stop.
         AC-64 does not enumerate it; recorded as spec defect S-2, not as a
         defect, because visual order, DOM order and tab order still agree
         (§7.3). */
      screen.getByRole('link', { name: 'Eyvar' }),
      /* The four workspace tiles are ONE stop — roving tabindex — landing on
         the first of them. */
      railTile('management'),
      /* …then the pinned Admin tile. **Nothing sits between them any more:**
         the disclosure that used to occupy this slot is deleted by D5. */
      railTile('admin'),
      /* The sub-tab list is ONE stop, landing on its first row. */
      within(column).getAllByRole('link')[0]!,
      /* …then the top bar. */
      screen.getByRole('searchbox', { name: en('shell.topbar.search') }),
    ]

    const seen: Element[] = []
    for (let i = 0; i < 12; i += 1) {
      await user.tab()
      seen.push(document.activeElement!)
    }

    expected.forEach((el, i) => {
      expect(seen[i], `tab stop ${i + 1}`).toBe(el)
    })

    /* …and the content region is reached after the top bar's four slots. */
    const names = seen.map((el) => (el.getAttribute('aria-label') ?? el.textContent ?? '').trim())
    expect(names).toContain('content-button')
    expect(names.indexOf('content-button')).toBeGreaterThan(
      names.indexOf(en('shell.topbar.account')),
    )
    /* The content region itself is the last thing before the loop, which is
       what "then into the content region" means. */
    expect(main.contains(seen[names.indexOf('content-button')]!)).toBe(true)
  })

  /**
   * **Round 2, replacing "keeps the disclosure in the SAME tab position".**
   * D5 deleted the disclosure, so the criterion it defended is void; what
   * replaces it is that the slot is not merely empty of that control but empty
   * of ANY control. The rail is five tiles and a wordmark, full stop.
   */
  it('puts no control between the last rail tile and the sub-tab list (D5)', async () => {
    const user = userEvent.setup()
    renderShell('/operations/people')
    await screen.findByRole('main')

    const column = screen.getByRole('heading', { level: 2 }).closest('nav')!
    const rail = screen.getByRole('navigation', { name: en('shell.nav.workspaces') })

    /* The rail contains no button at all — a disclosure would be one. */
    expect(rail.querySelectorAll('button')).toHaveLength(0)

    railTile('admin').focus()
    await user.tab()
    expect(column.contains(document.activeElement)).toBe(true)
    expect(document.activeElement).toBe(within(column).getAllByRole('link')[0])
  })

  it('moves within the rail with arrow keys and reaches the pinned Admin tile with Tab', async () => {
    const user = userEvent.setup()
    renderShell('/operations/people')
    await screen.findByRole('main')

    railTile('management').focus()
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(railTile('operations'))
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(railTile('financials'))
    /* Tab leaves the roving group. Under D5 the very next stop is Admin. */
    await user.tab()
    expect(document.activeElement).toBe(railTile('admin'))
  })
})

/* ════════════════════════════════ AC-65 ═════════════════════════════════ */

describe('AC-65 — "Every icon-only control in the shell has an accessible name"', () => {
  it('names the five rail tiles, the bell and the avatar', async () => {
    renderShell('/operations/people')
    await screen.findByRole('main')

    for (const workspace of table.workspaces) {
      expect(railTile(workspace.id), workspace.id).toBeInTheDocument()
    }
    /* **The collapse control is deliberately NOT asserted.** AC-65 as written
       still enumerates "the sub-tab list's collapse control", which D5 deleted
       — recorded as spec defect S-7 for product-owner. Asserted here is the
       fact that replaces it: no such control exists to need a name. */
    expect(screen.queryByRole('button', { name: en('shell.nav.hideSubTabs') })).toBeNull()
    expect(screen.queryByRole('button', { name: en('shell.nav.showSubTabs') })).toBeNull()
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

  /* **Round 2 — the sub-tab popover test is deleted, not re-pointed.** D5
     removed the popover, so "Escape closes it and returns focus to the
     disclosure" has no subject. AC-66's remaining three subjects — the account
     menu, the bell popover and the shell layer — are all still covered below,
     and the "no popover exists" fact is asserted once, in `qa.shell.test.tsx`'s
     D5 block, rather than twice. */

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
   * **Round 2 — D-1 is FIXED, so this test is inverted.** It was `it.fails`
   * in round 1 and its going red is what proved the fix landed.
   *
   * The bug: Radix's `Portal` mounts its children in a SECOND commit, so when
   * `ShellLayer`'s `useFocusEntry` effect ran, `containerRef.current` and
   * `initialFocusRef.current` were both still `null`, and the effect's deps
   * were all stable ref objects so it never retried. The fix holds the two
   * nodes in state via callback refs, so the ref object's identity changes when
   * the node lands and the effect re-runs against a real element.
   *
   * Kept — not deleted — because the failure mode is invisible in a unit test
   * of the hook and returns silently on any Radix bump.
   */
  it('moves focus into the layer on open, past the portal\'s second commit', async () => {
    render(
      <ShellLayer open onClose={() => undefined} title="Rider 1041" t={t}>
        <button>inside the layer</button>
      </ShellLayer>,
    )
    const dialog = await screen.findByRole('dialog')
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement))
  })

  /**
   * **DEFECT D-11 — a layer opened from inside a popover does not receive
   * focus.** This is NOT D-1 and it was not fixed with it: `See all` closes the
   * Radix popover, and a closing popover restores focus to **its own trigger**
   * (the bell) asynchronously, AFTER `useFocusEntry` has already moved focus
   * into the drawer. Last writer wins, and it is the popover.
   *
   * The same shape applies to any layer opened from a popover or a
   * dropdown-menu — which includes the account menu's `My profile`, i.e. two of
   * the three ways an operator reaches a shell layer from the top bar.
   *
   * `it.fails` because AC-67 makes it a criterion failure, not a nicety.
   * **Owner: product-designer** — who owns focus when a popover hands off to a
   * layer is a design ruling, and `02-shell-fixes.md` §13 raised it there.
   */
  it.fails(
    'DEFECT D-11 — a layer opened from inside a popover does NOT receive focus',
    async () => {
      const user = userEvent.setup()
      renderShell('/operations/people')
      await screen.findByRole('main')

      const bell = screen.getByRole('button', { name: en('shell.topbar.notifications') })
      await user.click(bell)
      await user.click(await screen.findByRole('button', { name: en('shell.notifications.seeAll') }))
      const dialog = await screen.findByRole('dialog')

      await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))
    },
  )

  /**
   * **Round 2 — D-2 is FIXED, so this test is inverted and kept at its
   * strongest.**
   *
   * The bug: `sheet.tsx` sets Radix `modal={false}`, which clears `trapped` —
   * but `@radix-ui/react-dialog` hardcodes `loop: true` on its `FocusScope`
   * (`dist/index.mjs:223`) and `FocusScope`'s Tab handler runs when
   * `loop || trapped` (`react-focus-scope/dist/index.mjs:109`). So `Tab` on the
   * last tabbable was `preventDefault()`-ed and looped back to the first.
   * `modal={false}` never switched that off.
   *
   * **This is exactly the kind of thing that returns silently on a dependency
   * bump** — the fix lives in our own key handler racing a hardcoded constant
   * in a package we do not control — so the test stays, and it stays strong:
   * focus must ENTER the layer, and `Tab` from the last control must LEAVE it
   * while the layer stays OPEN. A loop makes "leave" impossible however many
   * times you press.
   *
   * `src/hooks/useFocusEntry.test.ts` proves the HOOK installs no trap. It
   * cannot prove the SHELL LAYER is untrapped, because the trap arrived from
   * the component the hook composes with.
   */
  it('Tab past the layer\'s last control moves into the page behind it, and the layer stays open', async () => {
    const user = userEvent.setup()
    renderShell('/operations/people?account=me')
    const dialog = await screen.findByRole('dialog')

    /* Focus enters on open (AC-67, first clause) — no manual `.focus()` here,
       so this test also fails if D-1 ever comes back. */
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))

    const inside = within(dialog).getAllByRole('button')
    expect(inside.length).toBeGreaterThan(0)
    inside[inside.length - 1]!.focus()

    const visited: boolean[] = []
    for (let i = 0; i < 20; i += 1) {
      await user.tab()
      visited.push(dialog.contains(document.activeElement))
    }
    /* Focus leaves the layer — a trap makes every entry `true`. */
    expect(visited).toContain(false)
    /* …and the layer is still open, which is the other half of the criterion:
       leaving must not be achieved by closing. */
    expect(screen.getByRole('dialog')).toBe(dialog)
  })

  it('Shift+Tab from the layer\'s first control also leaves it, and the layer stays open', async () => {
    const user = userEvent.setup()
    renderShell('/operations/people?account=me')
    const dialog = await screen.findByRole('dialog')
    const inside = within(dialog).getAllByRole('button')
    const first = inside[0]!

    /* The backwards edge of the same guarantee. Radix's `loop` wrapped BOTH
       edges, so a regression that restores it shows up here first — this is
       the assertion that replaces round 1's "focus loops back to the FIRST
       control instead", which recorded the defect and is now void. */
    first.focus()
    const visited: boolean[] = []
    for (let i = 0; i < 20; i += 1) {
      await user.tab({ shift: true })
      visited.push(dialog.contains(document.activeElement))
    }
    expect(visited).toContain(false)
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
    await user.click(railTile('financials'))
    expect(railTile('financials')).toHaveAttribute('aria-current', 'page')
  })
})

/* ════════════════════════════════ AC-63 ═════════════════════════════════ */

describe('AC-63 — "Every rail tile and every sub-tab row is reachable by keyboard and shows a visible focus indicator"', () => {
  it('reaches all five rail tiles and all nine Operations rows with the keyboard alone', async () => {
    const user = userEvent.setup()
    renderShell('/operations/people')
    await screen.findByRole('main')

    /* The rail: one Tab stop, then arrows through the group, then Admin.
       **One `Tab`, not two** — D5 deleted the disclosure that used to sit
       between the group and Admin. */
    railTile('management').focus()
    const railSeen: Element[] = [document.activeElement!]
    for (let i = 0; i < 3; i += 1) {
      await user.keyboard('{ArrowDown}')
      railSeen.push(document.activeElement!)
    }
    await user.tab()
    railSeen.push(document.activeElement!)
    expect(railSeen).toEqual(table.workspaces.map((w) => railTile(w.id)))

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
    /* **DEFECT D-3, as CORRECTED in round 2.** A row is announced as
       `My Work 12` — its label and a bare numeral. Round 1 reported `My Work12`
       and called the missing separator the defect; that reading was measured
       from `textContent`, and `textContent` is not the accessible name. The
       accname algorithm joins element contributions with a space, so the
       separator was never missing. **What IS missing is still real:** the
       numeral has no label, so the row says "12" where the rail tile says
       "35 items need attention". See the corrected D-3 test below.
       Asserted by prefix here so the criterion under test (reachability) is not
       masked by the naming defect either way. */
    expect(rowsSeen.map((n, i) => n.startsWith(en(rows[i]!.titleKey)))).toEqual(rows.map(() => true))
    expect(rowsSeen.some((n) => /\d/.test(n))).toBe(true)
  })

  /**
   * **DEFECT D-3, corrected and still open.** A sub-tab row with a backlog is
   * announced as `My Work 12` — the label and a bare numeral, where the rail
   * tile beside it says `Ops 35 items need attention`. Two nav levels, two
   * different contracts, and only one of them tells the operator what the
   * number counts.
   *
   * **Round 1 got half of this wrong and it is corrected here.** It reported
   * the name as `My Work12` and named "no separator" as the defect; that was
   * measured from `textContent`, which is not the accessible name. The accname
   * algorithm inserts a space between element contributions, so the separator
   * was never missing. The MISSING LABEL is.
   *
   * Not fixed, deliberately, and frontend-engineer was right not to invent it:
   * the only key that exists is `shell.nav.backlog` ("{count} items need
   * attention"), which is wrong for a neutral count, and writing a neutral one
   * is copy. **Owner: product-designer — one key.**
   */
  it('DEFECT D-3 — a sub-tab row announces its count as a bare numeral with no label', async () => {
    renderShell('/operations/people')
    await screen.findByRole('main')
    const column = screen.getByRole('heading', { level: 2 }).closest('nav')!
    const rowWithCount = within(column)
      .getAllByRole('link')
      .find((el) => el.querySelector('[data-slot="badge"]'))
    expect(rowWithCount, 'no Operations row currently carries a count').toBeDefined()

    /* The badge has no name of its own, so its digits compose raw. */
    expect(rowWithCount!.querySelector('[data-slot="badge"]')).not.toHaveAttribute('aria-label')

    /* And the rail's own tile, for contrast: same fixture, same kind of
       number, a name that says what it is. This pair is the finding. */
    const tile = railTile('operations')
    expect(tile.querySelector('[data-slot="badge"]')).toHaveAttribute('aria-label')
  })

  /**
   * **Round 2 — D-4 is FIXED, so this test is inverted.** The tile no longer
   * carries an `aria-label` of its own, so its subtree — including the badge's
   * own label — composes into the accessible name. Round 1's version asserted
   * the broken state and its going red is what proved the fix landed.
   *
   * Kept because the regression is a one-word edit: putting any `aria-label`
   * back on the tile silently deletes the count from the accessible name again.
   */
  it('announces the rail tile\'s count: the tile sets no aria-label, so the badge composes into its name', async () => {
    renderShell('/operations/people')
    await screen.findByRole('main')
    const tile = railTile('operations')
    const badge = tile.querySelector('[data-slot="badge"]')
    expect(badge, 'Operations has no tile badge in this fixture').not.toBeNull()

    /* The badge names itself… */
    expect(badge).toHaveAttribute('aria-label')
    /* …and nothing above it overrides the subtree. An `aria-label` on the tile
       REPLACES the whole subtree in the accessible-name computation, which is
       exactly how the count came to be announced to nobody. */
    expect(tile).not.toHaveAttribute('aria-label')
    /* The count reaches assistive technology: the tile's name carries a digit
       and the badge's own wording. */
    expect(
      screen.getByRole('link', {
        name: new RegExp(`^${railLabel('operations')}\\s+\\d`),
      }),
    ).toBe(tile)
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
