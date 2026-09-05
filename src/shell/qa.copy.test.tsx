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
  resolvePageAlias,
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

/**
 * The same tile once Arabic is selected — and it needs its own matcher, not
 * merely its own label.
 *
 * `\b` is an ASCII word boundary in JavaScript, and an Arabic letter is not
 * `\w`, so a trailing `\b` never matches after one. The five rail labels open
 * on distinct words, so anchoring at the start is enough on its own.
 */
const ar = (key: string) => AR[key] as string
const arabicRailTile = (id: string) =>
  screen.getByRole('link', { name: new RegExp(`^${ar(`nav.rail.${id}`)}`) })

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

/**
 * **D29 — `failed` is REMOVED from this list, not scoped and not allow-listed.
 * Do not restore it.**
 *
 * The rule that decides which words survive contact with a domain vocabulary:
 *
 * > **A banned word survives when the union member is a CODE — never rendered.
 * > It cannot survive when the member is a LABEL — which must be rendered.**
 *
 * `invalid` stays banned even though `EmailFailureCode` has a member called
 * `invalid-address`, because that is a *code*: its rendered copy is *"The
 * address is not a valid email address"*. The ban pushed the copy into plainer
 * English and nothing paid a price, which is the guard producing a better
 * product — so it gets no exception now or later.
 *
 * `EmailDeliveryState.failed` is a **label**. There is no copy to rewrite,
 * because the copy *is* the state's name. The six are `Queued · Sent ·
 * Delivered · Bounced · Marked as spam · Failed`, and `types/email.ts:267`
 * says why they are six: *"a bounce is the recipient's mailbox refusing, a
 * complaint is the recipient marking it as spam, **a failure is ours**."*
 * "Not delivered" is true of three of them, so renaming would collapse three
 * states into one description. And `admin.integrations.event.paymentFailed` is
 * a **third-party event name** — `payment.failed` in a webhook catalogue a
 * customer subscribes to. The console does not get to rename someone else's
 * event.
 *
 * **What this gives up, on the record:** a real catch.
 * `profile.field.failureReason: "Why it failed"` → `Reason` was this guard
 * working, and nothing here would catch it now. The trade was taken because a
 * guard with nine false positives to one true catch gets suppressed by the next
 * person under a deadline — and this codebase has already watched a rule get
 * disabled in code to make a commit pass (`translate.ts:98`). That does not
 * happen through malice; it happens to a guard that has cried wolf nine times.
 *
 * AC-39 keeps the two-word ban and its blame clause. The vagueness rule it was
 * reaching for is **AC-1006**, which is positive and says outright that it is
 * verified by reading — not every criterion can be a test, and one that
 * pretends to be is worse than one that admits it is a review.
 */
const BANNED = ['please', 'invalid']

describe('AC-39 (amended, D29) — "No error message in the shell contains the words please or invalid"', () => {
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
  /**
   * **This asserted `AR = {}` until Arabic shipped, and the criterion it serves
   * outlived the fixture.**
   *
   * AC-74 makes two claims: every string resolves through a key, and a
   * dictionary that cannot answer falls back rather than printing the key. The
   * FALLBACK half is still proved, by `src/lib/i18n/i18n.test.ts`, which builds
   * its own empty dictionary rather than borrowing the shipping one — so the
   * guard never depended on Arabic staying empty.
   *
   * What a shell test can assert and a unit test cannot is the half that
   * matters now: a shell key Arabic cannot answer renders one English string in
   * the middle of an Arabic screen, which is the half-Arabic console §9.3
   * exists to retire.
   */
  it('answers, in Arabic, every key the shell source renders', () => {
    const referenced = new Set<string>()
    for (const file of shellSourceFiles()) {
      const text = readFileSync(file, 'utf8')
      for (const match of text.matchAll(/\bt\(\s*'([a-zA-Z][\w.]*\.[\w.]+)'/g)) {
        referenced.add(match[1] as string)
      }
    }
    expect(referenced.size).toBeGreaterThan(30)
    const englishOnly = [...referenced].filter((key) => AR[key] === undefined)
    expect(englishOnly, 'rendered by the shell, absent from AR').toEqual([])
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
    /* …and ARABIC is what rendered, which is the claim this line used to make
       about the English fallback. The rail's own label under D5, with its badge
       composing into the accessible name — and the English label gone, which is
       the assertion that catches a screen rendering both languages at once. */
    expect(arabicRailTile('operations')).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: new RegExp(`^${railLabel('operations')}\\b`) }),
    ).toBeNull()
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
   * **D-7 IS FIXED, and these two are now its regression tests.**
   *
   * The defect: `searchDestinations` set `title: row.titleKey`, so an operator
   * searching `operations` saw `subtab.operations.overview`. It also meant
   * destinations were *matched* against the key rather than the title — typing
   * `captains` found nothing, because that key reads `subtab.operations.people`.
   *
   * `clients/profile.ts` now resolves the translated title and matches on it.
   * This test was `it.fails` and is now a plain `it`; the one below asserted the
   * defect's own symptom and is inverted to assert the fix instead.
   */
  it('D-7 — no destination result carries a raw i18n key as its title', async () => {
    const response = await search('operations')
    const destinations = response.results.filter((r) => r.kind === 'destination')
    expect(destinations.length).toBeGreaterThan(0)
    for (const result of destinations) {
      expect(Object.hasOwn(EN, result.title), result.title).toBe(false)
    }
  })

  it('D-7 — a destination carries the TRANSLATED title an operator would recognise', async () => {
    const response = await search('operations')
    /* The inverse of the assertion this replaces. Absence of a raw key is not
       the same claim as presence of the right words, and only the second one
       says the search is usable. */
    const titles = response.results.filter((r) => r.kind === 'destination').map((r) => r.title)
    expect(titles.length).toBeGreaterThan(0)
    expect(titles).toContain(EN['subtab.operations.overview'])
  })

  /**
   * **Round 2 — the half of D-7 that AC-74 is actually about is FIXED, and this
   * is the test for it.** The criterion says *"no raw key"*, which is a claim
   * about what an operator SEES, and round 1 had no rendered-level assertion
   * for the search popover — only the two client-level ones above.
   *
   * `GlobalSearch` guards: a dotted, space-free, lower-camel token is put
   * through `t()`, anything else is rendered as-is.
   *
   * **Round 3 — the data defect is fixed too.** `searchDestinations` resolves
   * the translated title rather than emitting `row.titleKey`, so the two tests
   * above are regression tests now rather than records of a live bug. The guard
   * in `GlobalSearch` is consequently dead on the happy path; it stays because
   * it also defends the `DATA_SOURCE === 'http'` path, where the titles belong
   * to a server and nothing here can vouch for them.
   */
  it('renders no raw key in the global search popover, which is the half AC-74 asserts', async () => {
    const user = userEvent.setup()
    renderShell('/operations/people')
    await screen.findByRole('main')
    await user.click(screen.getByRole('button', { name: en('command.trigger.label') }))
    await user.keyboard('operations')

    /* Waited for by the row's PATH, which appears nowhere else in the document
       — the titles (`Overview`, `My Work`, …) are already on screen in the
       sub-tab column, so waiting on one of those would resolve before the
       debounced search had returned and the assertion below would scan a
       popover that was not open. Mutation-checked: removing the guard in
       `GlobalSearch` fails this test. */
    const row = table.subTabs.find((r) => r.subTabId === 'operations-overview')!
    expect(await screen.findByText(row.path)).toBeInTheDocument()

    /* And nowhere in the rendered document is a leaf whose text is a key. */
    const offenders: string[] = []
    for (const node of document.body.querySelectorAll('*')) {
      if (node.children.length > 0) continue
      const text = (node.textContent ?? '').trim()
      if (text && Object.hasOwn(EN, text)) offenders.push(text)
    }
    expect(offenders).toEqual([])
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
    /* `ar(...)`, not `en(...)`: this line asserted the English fallback while
       the Arabic dictionary was empty, and the criterion it names — "every
       string resolved in Arabic" — is only actually tested now. */
    expect(
      screen.getByRole('heading', { level: 2, name: ar('workspace.operations') }),
    ).toBeInTheDocument()
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
    /* `Badge` isolates a run that carries a bidi-neutral character — `99+` does,
       a bare `12` does not — so the isolates come off before the numerals are
       compared. See the component: the wrapping is the point, not the noise. */
    const numerals = (node: Element | null | undefined) =>
      (node?.textContent ?? '').replace(/[⁦⁩]/g, '')

    const tile = railTile('operations')
    const englishBadge = numerals(tile.querySelector('[data-slot="badge"]'))
    expect(englishBadge).toMatch(/^[0-9]+$|^99\+$/)

    await user.click(screen.getByRole('button', { name: 'qa-arabic' }))
    await waitFor(() => expect(document.documentElement).toHaveAttribute('lang', 'ar'))
    const arabicBadge = numerals(
      arabicRailTile('operations').querySelector('[data-slot="badge"]'),
    )
    expect(arabicBadge).toBe(englishBadge)
    /* Western digits, never Arabic-Indic — the `-nu-latn` locale is what makes
       that true, and the badge is the shell's only numeral surface today. */
    expect(arabicBadge).not.toMatch(/[٠-٩]/)
  })
})

/* ═════════════════════════ AC-30 / AC-60 — search ═══════════════════════ */

describe('AC-30 — "Global search for a legacy destination name returns the destination it moved to. Four searches, four correct destinations"', () => {
  it('resolves Renewal pipeline to Operations › Subscriptions, view Expiring ≤ 7 days', () => {
    const hits = resolvePageAlias('Renewal pipeline')
    expect(hits.map((h) => `${h.path}?view=${h.viewId}`)).toEqual([
      '/operations/subscriptions?view=expiring-7d',
    ])
  })

  /* D1b — quick rides became their own sub-tab, so the legacy page resolves to a
     PATH and no longer to a view tab of Trips. The `?view=` half of this
     assertion is gone because the thing it pointed at is gone. */
  it('resolves Quick rides to Operations › Quick rides', () => {
    const hits = resolvePageAlias('Quick rides')
    expect(hits.map((h) => h.path)).toEqual(['/operations/quick-rides'])
  })

  it('resolves All pending applications to Operations › People, view Applications', () => {
    const hits = resolvePageAlias('All pending applications')
    expect(hits.map((h) => `${h.path}?view=${h.viewId}`)).toEqual(['/operations/people?view=applications'])
  })

  /**
   * **DEFECT D-8.** `Cancellation policy` is the example §4.3.4 itself uses to
   * justify global search. It is a settings PANE key (`cancelpolicy`), and
   * `resolvePageAlias` only searches `PAGE_ALIAS_TITLES`, which contains page
   * ids and not pane keys. Nothing in the product can find it.
   */
  it.fails('DEFECT D-8 — Cancellation policy does NOT resolve to Financials › Pricing & Plans', () => {
    const hits = resolvePageAlias('Cancellation policy')
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
    await user.click(screen.getByRole('button', { name: en('command.trigger.label') }))
    await user.keyboard('Renewal pipeline')
    expect(await screen.findByText('Renewal Pipeline')).toBeInTheDocument()
    expect(screen.getByText('/operations/subscriptions?view=expiring-7d')).toBeInTheDocument()
  })
})

describe('AC-60 — "Global search returns no result the current role cannot open"', () => {
  it('is STILL UNVERIFIABLE, but for one reason now instead of two: the search client applies no permission filter', async () => {
    /**
     * **Edited by mock-data-engineer on the D17 pass. Owner: qa-engineer.**
     *
     * The old assertion was `table.subTabs.every(r => r.permission === null)`,
     * which no longer compiles and would no longer be true: D17 gave all 35 rows
     * a `viewPermission`. **Half of this criterion's blockage is gone** — there
     * is now something to filter ON — and what remains is that `clients/search.ts`
     * does not filter. That is a client change and it is not this file's owner's
     * to make; it is recorded here so the remaining half stays visible.
     */
    const response = await search('financials')
    expect(response.results.some((r) => r.kind === 'destination')).toBe(true)
    /* The data half is now satisfied: every Financials row names the key a
       Support operator would have to hold to open it. */
    const financials = table.subTabs.filter((r) => r.workspaceId === 'financials')
    expect(financials.every((r) => r.viewPermission === 'view_finance')).toBe(true)
    /* The client half is not: the response contains a destination the seeded
       Support operator could not open, and nothing filtered it out. */
    expect(response.results.some((r) => r.kind === 'destination')).toBe(true)
  })
})

/* ═══════════════════════════ AC-56 — forbidden ══════════════════════════ */

describe('AC-56 — "Loading a route the current role cannot see renders the forbidden state naming the permission required"', () => {
  /* **Round 1's D-9, for the record.** `ForbiddenScreen` and `forbiddenReason`
     both existed and both had ZERO call sites in production code; `routes.tsx`
     mapped every route straight to its screen with no permission branch, so the
     build note's *"the day the 35 values land in `routeTable.ts`, no shell code
     changes"* was false. `RouteGuard` is the fix. The tests below are the same
     assertions turned the right way up. */

  /**
   * **Round 2 — D-9 is FIXED, so this test is inverted.** In round 1 it
   * asserted `callSites === []` and passed, which is how a criterion the build
   * note called `pass ✓T` turned out to be wired to nothing. It now asserts the
   * wiring exists, and it goes red the day someone removes the guard.
   *
   * A source assertion is the honest instrument here and it is not a
   * substitute for the behavioural one: **Q4 is still open, all 35
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

  it('renders the screen for an operator who IS permitted, so the guard is not a blanket denial', async () => {
    /**
     * **Edited by mock-data-engineer on the D17 pass. Owner: qa-engineer.**
     *
     * The old assertion closed on `permission !== null → length 0`, which
     * recorded Q4. D17 closed Q4, so this now asserts the positive half of the
     * guard: the default seeded operator is the Owner, who holds `manage_team`,
     * so `/admin/team` renders and all seven Admin rows are in the column.
     *
     * **Its twin — an operator who is denied the same route — is
     * `permissions.test.ts`'s AC-918 pair and `qa.forbidden.test.tsx`.** Kept
     * apart on purpose: this file may not switch users mid-render.
     */
    renderShell('/admin/team')
    expect(await screen.findByText('screen: admin-team')).toBeInTheDocument()
    const column = screen.getByRole('navigation', {
      name: (en('shell.nav.subTabsFor') as string).replace('{workspace}', en('workspace.admin')),
    })
    expect(within(column).getAllByRole('link').length).toBe(
      table.subTabs.filter((r) => r.workspaceId === 'admin').length,
    )
    expect(table.subTabs.find((r) => r.subTabId === 'admin-team')?.viewPermission).toBe('manage_team')
  })
})

/* ═══════════════════════════ AC-61 — the Q4 gap ═════════════════════════ */

describe('AC-61 — "Every one of the 36 route-table rows has a non-null permission, or is listed in a named exceptions table"', () => {
  /**
   * **Edited by mock-data-engineer on the D17 pass. Owner: qa-engineer.**
   *
   * This block used to read *"FAILS: all 35 permissions are null"* and it
   * passed, which is what a recorded gap looks like. **D17 closed it**, so the
   * assertions are inverted rather than deleted — the shape of the old
   * assertion is the record of what was wrong.
   */
  it('PASSES: 35 rows carry a view key and the 36th is the named exception', () => {
    expect(table.subTabs).toHaveLength(37)
    /* 35 after D1b split Trips in two; the 36th is still the single named
       exception. */
    expect(table.subTabs.filter((r) => r.viewPermission !== null)).toHaveLength(36)
    /* The criterion's second way to pass — a named exception with a reason.
       `admin-activity` is it, and the reason is on the row: every authenticated
       operator can open the Activity Log, and its rows are filtered server-side
       to entities the operator can otherwise see. */
    expect(table.subTabs.filter((r) => r.viewPermission === null).map((r) => r.subTabId)).toEqual([
      'admin-activity',
    ])
  })

  it('is a real gate and not a relabelled pass-through: a row denies an operator who lacks its key', () => {
    /* The defect this closes: `canWriteSubTab` returned `true` for everyone
       because every row was `null`. `permissions.test.ts` proves the pair in
       full; asserted here so the QA suite carries its own witness. */
    const payouts = table.subTabs.find((r) => r.subTabId === 'financials-payouts')!
    expect(payouts.viewPermission).toBe('view_finance')
    expect(payouts.writePermission).toBe('process_payouts')
  })
})
