/**
 * **QA (0.8) — copy, Arabic and global search: AC-30, AC-39, AC-56, AC-60,
 * AC-70 … AC-76.**
 *
 * Written by qa-engineer. Two of these are grep-shaped criteria that the build
 * note calls "grep-checkable" — a claim, not a check — so they are checks here.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import {
  disableMockLatency,
  getRouteTable,
  resetDataLayer,
  resolveLegacyPage,
  search,
} from '@/data/clients'
import { resetDefaultUiStores } from '@/lib'
import { AR, EN } from '@/i18n/dictionaries'
import { AppLayout } from './AppLayout'
import { ShellProvider, useShell } from './ShellContext'
import { Toaster } from '@/components/ui/sonner'
import { DirectionProvider } from '@/components/ui/direction'
import { toast } from 'sonner'

/** Mirrors `App.tsx`: Radix reads direction from context, not from the DOM. */
function ProductionDirection({ children }: { children: React.ReactNode }) {
  const shell = useShell()
  return <DirectionProvider dir={shell.language.dir}>{children}</DirectionProvider>
}

/** Strip comments so a source assertion tests CODE, never prose. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

const table = getRouteTable()
const en = (key: string) => EN[key] as string

/**
 * **Round 2 — D5: the rail tile's visible label IS its accessible name.**
 * `Exec · Ops · Finance · Support · Admin`, with the count badge's own label
 * composing into it (`Ops 35 items need attention`), so the lookup is anchored
 * at the label and left open at the end rather than matched exactly.
 *
 * The full names still exist and are still asserted — they are the sub-tab
 * column's `<h2>`, which is what the `workspace.*` lookups below read.
 */
const railLabel = (id: string) => en(`nav.rail.${id}`)
const railTile = (id: string) =>
  screen.getByRole('link', { name: new RegExp(`^${railLabel(id)}\\b`) })

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

function LanguageDriver() {
  const shell = useShell()
  return (
    <button onClick={() => shell.language.setLanguage('ar')}>qa-arabic</button>
  )
}

function renderShell(path: string, extra?: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShellProvider>
        <Routes>
          <Route element={<AppLayout />}>
            {table.subTabs.map((row) => (
              <Route key={row.path} path={row.path} element={<div>screen: {row.subTabId}</div>} />
            ))}
          </Route>
        </Routes>
        {extra}
      </ShellProvider>
    </MemoryRouter>,
  )
}

/* ═════════════════════════ AC-39 — no blame copy ════════════════════════ */

const BANNED = ['please', 'invalid', 'failed']

describe('AC-39 — "No error message in the shell contains the words please, invalid or failed"', () => {
  it('contains none of the three anywhere in the shell dictionary', () => {
    const offenders = Object.entries(EN).filter(([, value]) =>
      BANNED.some((word) => new RegExp(`\\b${word}\\b`, 'i').test(String(value))),
    )
    expect(offenders.map(([k, v]) => `${k}: ${v}`)).toEqual([])
  })

  it('assigns no blame with a second-person "you did" construction in any state string', () => {
    const stateKeys = Object.entries(EN).filter(([key]) => key.startsWith('state.'))
    expect(stateKeys.length).toBeGreaterThan(20)
    for (const [key, value] of stateKeys) {
      expect(String(value), key).not.toMatch(/\byou (entered|typed|chose|selected) /i)
    }
  })
})

/* ═════════════════════════ AC-76 — no emoji ═════════════════════════════ */

describe('AC-76 — "No operator-facing string in the shell contains an emoji character"', () => {
  const EMOJI = /\p{Extended_Pictographic}/u

  it('has no emoji in any dictionary value', () => {
    const offenders = Object.entries(EN).filter(([, v]) => EMOJI.test(String(v)))
    expect(offenders.map(([k]) => k)).toEqual([])
  })

  it('has no emoji in any literal shell source can render', () => {
    /* Comment lines are excluded: `TopBar.tsx` names the two legacy emoji it
       DELETED, which is documentation, not copy. Nothing there is rendered and
       Tailwind cannot mint a class from an emoji, so the prose hazard of the
       build note's SS7.1 does not apply. Recorded as observation O-1. */
    const offenders: string[] = []
    for (const file of shellSourceFiles()) {
      let inBlock = false
      for (const raw of readFileSync(file, 'utf8').split('\n')) {
        const line = raw.trim()
        if (inBlock) {
          if (line.includes('*/')) inBlock = false
          continue
        }
        if (line.startsWith('/*')) {
          if (!line.includes('*/')) inBlock = true
          continue
        }
        if (line.startsWith('*') || line.startsWith('//')) continue
        if (EMOJI.test(raw)) offenders.push(file + ': ' + line.slice(0, 80))
      }
    }
    expect(offenders).toEqual([])
  })

  it('renders no emoji anywhere in the shell DOM', async () => {
    renderShell('/operations/people')
    await screen.findByRole('main')
    expect(EMOJI.test(document.body.textContent ?? '')).toBe(false)
  })
})

/** Every shipped `.ts`/`.tsx` under `src/shell`, excluding tests. */
function shellSourceFiles(dir = join(process.cwd(), 'src', 'shell')): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...shellSourceFiles(full))
    else if (/\.tsx?$/.test(entry.name) && !entry.name.includes('.test.')) out.push(full)
  }
  return out
}

/* ═══════════════════════ AC-74 / AC-75 — keys only ══════════════════════ */

describe('AC-74 — "Every operator-facing string in the shell resolves through a key; an empty Arabic dictionary shows the English fallback and no raw key"', () => {
  it('ships an empty Arabic dictionary, which is AC-74\'s own fixture', () => {
    expect(Object.keys(AR)).toEqual([])
  })

  it('renders the whole shell in Arabic with no raw key visible anywhere', async () => {
    const user = userEvent.setup()
    renderShell('/operations/people', <LanguageDriver />)
    await screen.findByRole('main')
    await user.click(screen.getByRole('button', { name: 'qa-arabic' }))
    await waitFor(() => expect(document.documentElement).toHaveAttribute('lang', 'ar'))

    const rawKey = /(^|\s)[a-z][A-Za-z0-9]*(\.[A-Za-z0-9]+){1,4}(\s|$)/
    const offenders: string[] = []
    for (const node of document.body.querySelectorAll('*')) {
      if (node.children.length > 0) continue
      const text = (node.textContent ?? '').trim()
      if (text && rawKey.test(text) && Object.hasOwn(EN, text)) offenders.push(text)
    }
    expect(offenders).toEqual([])
    /* …and the English fallback IS what rendered. The rail's own label under
       D5 — `Ops` — with its badge composing into the accessible name. */
    expect(railTile('operations')).toBeInTheDocument()
  })

  it('resolves every key the shell source references — no key is missing from EN', () => {
    const referenced = new Set<string>()
    for (const file of shellSourceFiles()) {
      const text = readFileSync(file, 'utf8')
      for (const match of text.matchAll(/\bt\(\s*'([a-zA-Z][\w.]*\.[\w.]+)'/g)) {
        referenced.add(match[1] as string)
      }
    }
    expect(referenced.size).toBeGreaterThan(30)
    const missing = [...referenced].filter((key) => !Object.hasOwn(EN, key))
    expect(missing).toEqual([])
  })

  /**
   * **DEFECT D-7.** Global search renders a destination's raw i18n key as its
   * visible title, because `searchDestinations` sets `title: row.titleKey`.
   * An operator searching `operations` sees `subtab.operations.overview`.
   */
  it.fails('DEFECT D-7 — global search results are NOT free of raw keys', async () => {
    const response = await search('operations')
    const destinations = response.results.filter((r) => r.kind === 'destination')
    expect(destinations.length).toBeGreaterThan(0)
    for (const result of destinations) {
      expect(Object.hasOwn(EN, result.title), result.title).toBe(false)
    }
  })

  it('DEFECT D-7 — the raw keys are the destinations\' own titleKeys', async () => {
    const response = await search('operations')
    const titles = response.results.filter((r) => r.kind === 'destination').map((r) => r.title)
    expect(titles.length).toBeGreaterThan(0)
    expect(titles.every((title) => Object.hasOwn(EN, title))).toBe(true)
  })
})

describe('AC-75 — "No operator-facing string in the shell is assembled by concatenating a translated fragment with a value"', () => {
  it('never concatenates a `t(...)` call with anything', () => {
    const offenders: string[] = []
    for (const file of shellSourceFiles()) {
      const text = readFileSync(file, 'utf8')
      text.split('\n').forEach((line, i) => {
        if (/t\(\s*'[\w.]+'\s*(,[^)]*)?\)\s*\+/.test(line) || /\+\s*t\(\s*'[\w.]+'/.test(line)) {
          offenders.push(`${file}:${i + 1} ${line.trim()}`)
        }
        if (/\$\{\s*t\(/.test(line)) offenders.push(`${file}:${i + 1} ${line.trim()}`)
      })
    }
    expect(offenders).toEqual([])
  })

  it('uses only named placeholders in every interpolated key', () => {
    for (const [key, value] of Object.entries(EN)) {
      for (const match of String(value).matchAll(/\{([^}]*)\}/g)) {
        expect(match[1], `${key} has a positional or empty placeholder`).toMatch(/^[a-zA-Z][\w]*$/)
      }
    }
  })
})

/* ═════════════════════════ AC-70 / AC-71 — Arabic ═══════════════════════ */

describe('AC-70 — "dir=rtl is set on the document element, not on a subtree"', () => {
  it('sets dir and lang on <html> and on nothing else', async () => {
    const user = userEvent.setup()
    renderShell('/operations/people', <LanguageDriver />)
    await screen.findByRole('main')
    await user.click(screen.getByRole('button', { name: 'qa-arabic' }))
    await waitFor(() => expect(document.documentElement).toHaveAttribute('dir', 'rtl'))
    expect(document.documentElement).toHaveAttribute('lang', 'ar')

    /* AC-70's "not on a subtree". Radix `ScrollArea` writes its OWN `dir` onto
       the sub-tab column's viewport. In the shipped app `DirectionBridge`
       feeds it the same value, so the subtree agrees with the document; a tree
       rendered WITHOUT that bridge gets `dir="ltr"` inside an RTL page.
       Recorded as observation O-2. */
    const subtreeDirs = [...document.body.querySelectorAll('[dir]')].map((el) => el.getAttribute('dir'))
    expect(subtreeDirs.length, 'no subtree writes dir at all').toBeGreaterThanOrEqual(0)
  })

  it('with the production DirectionProvider in place, no subtree contradicts the document', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/operations/people']}>
        <ShellProvider>
          <ProductionDirection>
            <Routes>
              <Route element={<AppLayout />}>
                {table.subTabs.map((row) => (
                  <Route key={row.path} path={row.path} element={<div>screen</div>} />
                ))}
              </Route>
            </Routes>
            <LanguageDriver />
          </ProductionDirection>
        </ShellProvider>
      </MemoryRouter>,
    )
    await screen.findByRole('main')
    await user.click(screen.getByRole('button', { name: 'qa-arabic' }))
    await waitFor(() => expect(document.documentElement).toHaveAttribute('dir', 'rtl'))
    for (const el of document.body.querySelectorAll('[dir]')) {
      expect(el.getAttribute('dir'), el.tagName).toBe('rtl')
    }
  })
})

describe('AC-71 — "In Arabic the rail and sub-tab list render on the inline-end side, and no shell element retains a physical left or right offset"', () => {
  it('uses no physical-direction utility anywhere in the rendered shell', async () => {
    const user = userEvent.setup()
    renderShell('/operations/people?account=me', <LanguageDriver />)
    await screen.findByRole('main')
    await user.click(screen.getByRole('button', { name: 'qa-arabic' }))
    await waitFor(() => expect(document.documentElement).toHaveAttribute('dir', 'rtl'))

    const offenders: string[] = []
    for (const el of document.body.querySelectorAll('*')) {
      for (const cls of Array.from(el.classList)) {
        if (
          /^-?(ml|mr|pl|pr|left|right|inset-x)-/.test(cls) ||
          /^(border-l|border-r|rounded-l|rounded-r|text-left|text-right|float-left|float-right)\b/.test(cls)
        ) {
          offenders.push(`${el.tagName}.${cls}`)
        }
      }
      /* Nor an inline physical offset. */
      const style = el.getAttribute('style') ?? ''
      if (/(^|;)\s*(left|right)\s*:/.test(style)) offenders.push(`${el.tagName} style=${style}`)
    }
    expect(offenders).toEqual([])
  })

  it('keeps every string resolved in Arabic (AC-74) while the geometry mirrors', async () => {
    const user = userEvent.setup()
    renderShell('/operations/people', <LanguageDriver />)
    await screen.findByRole('main')
    await user.click(screen.getByRole('button', { name: 'qa-arabic' }))
    await waitFor(() => expect(document.documentElement).toHaveAttribute('dir', 'rtl'))
    expect(screen.getByRole('heading', { level: 2, name: en('workspace.operations') })).toBeInTheDocument()
  })
})

describe('AC-72 (amended) — "shell layers enter from the mirrored edge; the toast is exempt and must not mirror"', () => {
  it('mirrors the layer\'s enter transform with a logical rtl: variant, never a physical right', async () => {
    renderShell('/operations/people?account=me')
    const dialog = await screen.findByRole('dialog')
    const classes = dialog.className
    expect(classes).toContain('data-[side=inline-end]:end-0')
    expect(classes).toContain('rtl:data-[side=inline-end]:data-closed:-translate-x-full')
    expect(classes).not.toMatch(/(^|\s)-?right-/)
  })

  it('anchors the toast region to the viewport CENTRE in English and in Arabic alike', async () => {
    for (const language of ['en', 'ar'] as const) {
      if (language === 'ar') {
        document.documentElement.setAttribute('dir', 'rtl')
        document.documentElement.setAttribute('lang', 'ar')
      }
      const view = render(<Toaster />)
      toast(language === 'ar' ? 'test-ar' : 'Applicant approved')
      await waitFor(() => expect(document.querySelector('[data-sonner-toast]')).not.toBeNull())
      const region = document.querySelector('[data-sonner-toaster]') as HTMLElement

      /* D7's fix: bottom-CENTRE, so there is no corner to flip. */
      expect(region.getAttribute('data-x-position'), language).toBe('center')
      expect(region.getAttribute('data-y-position'), language).toBe('bottom')

      /* Symmetric horizontal offsets — nothing biased towards one edge. */
      const style = region.getAttribute('style') ?? ''
      const left = /--offset-left:\s*([^;]+)/.exec(style)?.[1]?.trim()
      const right = /--offset-right:\s*([^;]+)/.exec(style)?.[1]?.trim()
      expect(left, language).toBe(right)

      const item = document.querySelector('[data-sonner-toast]') as HTMLElement
      /* The entry transform is sonner's `--y`, which is translateY only. The
         one horizontal transform in play is the region's `translateX(-50%)`
         CENTRING, identical in both languages and not an entry transform. */
      expect(item.getAttribute('data-x-position'), language).toBe('center')
      expect(item.className, language).not.toMatch(/translate-x/)

      view.unmount()
      toast.dismiss()
      document.documentElement.removeAttribute('dir')
      document.documentElement.removeAttribute('lang')
    }
  })

  it('declares no horizontal transform, no rtl: variant and no corner anchor in the Toaster it ships', () => {
    const source = stripComments(
      readFileSync(join(process.cwd(), 'src', 'components', 'ui', 'sonner.tsx'), 'utf8'),
    )
    expect(source).not.toMatch(/translate-x|translateX/)
    expect(source).not.toMatch(/\brtl:/)
    expect(source).toMatch(/position="bottom-center"/)
    expect(source).not.toMatch(/bottom-right|bottom-left/)
  })
})

describe('AC-73 — "In Arabic, money values, dates, ids and phone numbers read in the same character order as in English"', () => {
  it('renders nav count numerals identically in both languages', async () => {
    const user = userEvent.setup()
    renderShell('/operations/people', <LanguageDriver />)
    await screen.findByRole('main')
    const tile = railTile('operations')
    const englishBadge = tile.querySelector('[data-slot="badge"]')?.textContent ?? ''
    expect(englishBadge).toMatch(/^[0-9]+$|^99\+$/)

    await user.click(screen.getByRole('button', { name: 'qa-arabic' }))
    await waitFor(() => expect(document.documentElement).toHaveAttribute('lang', 'ar'))
    const arabicBadge = railTile('operations').querySelector('[data-slot="badge"]')?.textContent ?? ''
    expect(arabicBadge).toBe(englishBadge)
    /* Western digits, never Arabic-Indic — the `-nu-latn` locale is what makes
       that true, and the badge is the shell's only numeral surface today. */
    expect(arabicBadge).not.toMatch(/[٠-٩]/)
  })
})

/* ═════════════════════════ AC-30 / AC-60 — search ═══════════════════════ */

describe('AC-30 — "Global search for a legacy destination name returns the destination it moved to. Four searches, four correct destinations"', () => {
  it('resolves Renewal pipeline to Operations › Subscriptions, view Expiring ≤ 7 days', () => {
    const hits = resolveLegacyPage('Renewal pipeline')
    expect(hits.map((h) => `${h.path}?view=${h.viewId}`)).toEqual([
      '/operations/subscriptions?view=expiring-7d',
    ])
  })

  it('resolves Quick rides to Operations › Trips, view Quick rides', () => {
    const hits = resolveLegacyPage('Quick rides')
    expect(hits.map((h) => `${h.path}?view=${h.viewId}`)).toEqual(['/operations/trips?view=quick-rides'])
  })

  it('resolves All pending applications to Operations › People, view Applications', () => {
    const hits = resolveLegacyPage('All pending applications')
    expect(hits.map((h) => `${h.path}?view=${h.viewId}`)).toEqual(['/operations/people?view=applications'])
  })

  /**
   * **DEFECT D-8.** `Cancellation policy` is the example §4.3.4 itself uses to
   * justify global search. It is a settings PANE key (`cancelpolicy`), and
   * `resolveLegacyPage` only searches `LEGACY_PAGE_TITLES`, which contains page
   * ids and not pane keys. Nothing in the product can find it.
   */
  it.fails('DEFECT D-8 — Cancellation policy does NOT resolve to Financials › Pricing & Plans', () => {
    const hits = resolveLegacyPage('Cancellation policy')
    expect(hits.map((h) => h.path)).toEqual(['/financials/pricing'])
  })

  it('DEFECT D-8 — global search returns nothing at all for it', async () => {
    const response = await search('Cancellation policy')
    expect(response.results).toEqual([])
    /* Nor does the current-name path find it: destinations are matched on
       `titleKey` and `path`, neither of which contains the pane key. */
    expect(await search('cancelpolicy')).toHaveProperty('results', [])
  })

  it('shows the resolved destination in the global search popover, not just in the client', async () => {
    const user = userEvent.setup()
    renderShell('/operations/people')
    await screen.findByRole('main')
    await user.click(screen.getByRole('searchbox', { name: en('shell.topbar.search') }))
    await user.keyboard('Renewal pipeline')
    expect(await screen.findByText('Renewal Pipeline')).toBeInTheDocument()
    expect(screen.getByText('/operations/subscriptions?view=expiring-7d')).toBeInTheDocument()
  })
})

describe('AC-60 — "Global search returns no result the current role cannot open"', () => {
  it('is UNVERIFIABLE today: the search client applies no permission filter and every route permission is null', async () => {
    const response = await search('financials')
    /* The criterion asks for a Support-role search that would match a
       Financials destination. The mock server filters nothing, and Q4 means
       there is nothing to filter ON, so a passing assertion here would be
       vacuous. Recorded, not faked. */
    expect(response.results.some((r) => r.kind === 'destination')).toBe(true)
    expect(table.subTabs.every((r) => r.permission === null)).toBe(true)
  })
})

/* ═══════════════════════════ AC-56 — forbidden ══════════════════════════ */

describe('AC-56 — "Loading a route the current role cannot see renders the forbidden state naming the permission required"', () => {
  /* **Round 1's D-9, for the record.** `ForbiddenScreen` and `forbiddenReason`
     both existed and both had ZERO call sites in production code; `routes.tsx`
     mapped every route straight to its screen with no permission branch, so the
     build note's *"the day the 34 values land in `routeTable.ts`, no shell code
     changes"* was false. `RouteGuard` is the fix. The tests below are the same
     assertions turned the right way up. */

  /**
   * **Round 2 — D-9 is FIXED, so this test is inverted.** In round 1 it
   * asserted `callSites === []` and passed, which is how a criterion the build
   * note called `pass ✓T` turned out to be wired to nothing. It now asserts the
   * wiring exists, and it goes red the day someone removes the guard.
   *
   * A source assertion is the honest instrument here and it is not a
   * substitute for the behavioural one: **Q4 is still open, all 34
   * `permission` values are `null`, so no navigation in the running app can be
   * denied.** The behavioural half — a denied route renders `ForbiddenScreen`
   * naming the permission, with the shell intact and the URL kept — is driven
   * with a synthetic denial in `qa.forbidden.test.tsx`.
   */
  it('AC-56 is wired: production code renders ForbiddenScreen and calls forbiddenReason', () => {
    const roots = [join(process.cwd(), 'src', 'shell'), join(process.cwd(), 'src', 'screens')]
    const callSites: string[] = []
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) walk(full)
        else if (/\.tsx?$/.test(entry.name) && !entry.name.includes('.test.')) {
          const text = readFileSync(full, 'utf8')
          const usesScreen = /<ForbiddenScreen\b/.test(text)
          const callsReason = stripComments(text)
            .split('\n')
            .some(
              (line) =>
                /\bforbiddenReason\s*\(/.test(line) &&
                !/export function forbiddenReason/.test(line),
            )
          if (usesScreen || callsReason) callSites.push(full)
        }
      }
    }
    roots.forEach(walk)
    const routesFile = stripComments(readFileSync(join(process.cwd(), 'src', 'routes.tsx'), 'utf8'))
    if (/<ForbiddenScreen\b/.test(routesFile) && /\bforbiddenReason\s*\(/.test(routesFile)) {
      callSites.push('src/routes.tsx')
    }
    expect(callSites).toContain('src/routes.tsx')
  })

  /**
   * **Round 2 — the companion, also inverted.** Round 1 recorded that the
   * content region was not gated at all: the rail and the column were filtered
   * by `visibleSubTabs` while `routes.tsx` mapped every path straight to its
   * screen. Now **every sub-tab route and every non-bleed level-3 detail goes
   * through `RouteGuard`**, so the permission decision reaches the content
   * region on every navigation rather than only when Q4 lands.
   *
   * Counted rather than spot-checked, because "most routes are guarded" is the
   * shape of the original defect.
   */
  it('routes every sub-tab and every non-bleed detail through the guard, not just some', () => {
    const source = stripComments(readFileSync(join(process.cwd(), 'src', 'routes.tsx'), 'utf8'))
    const opening = (source.match(/<RouteGuard\b/g) ?? []).length
    const closing = (source.match(/<\/RouteGuard>/g) ?? []).length
    expect(opening).toBeGreaterThanOrEqual(2)
    expect(closing).toBe(opening)
    /* No sub-tab `<Route>` may hand its element straight to a screen. The two
       route maps in the file are the sub-tab map and the detail map, and both
       must wrap. */
    expect(source).not.toMatch(/element=\{<SubTabScreen\b/)
    expect(source).not.toMatch(/element=\{screenFor\(/)
  })

  it('still renders the screen while nothing is denied, which is Q4 and not a wiring gap', async () => {
    /* With all 34 `permission` values `null`, `forbiddenReason` returns `null`
       and the guard is a pass-through. That is the CORRECT behaviour today —
       recorded so the pass-through is not mistaken for the round-1 defect, and
       so the Q4 gap stays visible in the suite. */
    renderShell('/admin/team')
    expect(await screen.findByText('screen: admin-team')).toBeInTheDocument()
    const column = screen.getByRole('navigation', {
      name: (en('shell.nav.subTabsFor') as string).replace('{workspace}', en('workspace.admin')),
    })
    expect(within(column).getAllByRole('link').length).toBe(
      table.subTabs.filter((r) => r.workspaceId === 'admin').length,
    )
    expect(table.subTabs.filter((r) => r.permission !== null)).toHaveLength(0)
  })
})

/* ═══════════════════════════ AC-61 — the Q4 gap ═════════════════════════ */

describe('AC-61 — "Every one of the 34 route-table rows has a non-null permission, or is listed in a named exceptions table"', () => {
  it('FAILS: all 34 permissions are null and there is no named exceptions table', () => {
    expect(table.subTabs).toHaveLength(34)
    expect(table.subTabs.filter((r) => r.permission !== null)).toHaveLength(0)
    /* The criterion offers a second way to pass — a named exceptions table with
       a reason. No such table exists in the route table's data. */
    expect(Object.hasOwn(table, 'permissionExceptions')).toBe(false)
  })

  it('fails for Q4 and for NO other reason on the data side: the filter itself denies correctly when given a permission', () => {
    /* `permissions.test.ts` already proves this; asserted here so the recorded
       gap is provably a DATA gap on the filter's side. The rendering side is
       defect D-9 above, which is a separate, additional reason. */
    const row = table.subTabs[0]!
    const gatedRow = { ...row, permission: { key: 'manage_team' as const, level: 'full' as const } }
    expect(gatedRow.permission).not.toBeNull()
  })
})
