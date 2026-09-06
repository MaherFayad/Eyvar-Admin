/**
 * Rate card in Arabic — §9 / §13 of `design/financials-pricing-rate-card.md`.
 *
 * Its own file because `useLanguageState` reads the language at mount, so a
 * store flipped mid-file would leak `ar` into the English suite beside it.
 * A key missing from Arabic falls back to English SILENTLY (AC-74), so every
 * test below reads the Arabic dictionary back and asserts it is on screen.
 */
import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { disableMockLatency, getRouteTable, resetDataLayer, switchMockUser } from '@/data/clients'
import type { SubTabRoute } from '@/data/types'
import { fixedClock } from '@/data/mock/clock'
import { resetClock, setClockSource } from '@/hooks'
import { defaultUiStore, UI_STATE_KEYS } from '@/lib'
import { AR, EN } from '@/i18n/dictionaries'
import { ShellProvider } from '@/shell/ShellContext'
import { PricingScreen } from './PricingScreen'

const pricingRow = (): SubTabRoute => {
  const row = getRouteTable().subTabs.find((each) => each.subTabId === 'financials-pricing')
  if (!row) throw new Error('No route-table row for financials-pricing')
  return row
}

/* O10 — the glyphs and the strings are picked by the SHELL's language, so a
   bare `dir` attribute is only half of Arabic. Seeding the store gives the
   provider the same direction the document element gets. */
const arabic = () => defaultUiStore<string>(UI_STATE_KEYS.language).write('ar')
const ar = (key: string) => AR[key] as string
const en = (key: string) => EN[key] as string

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
  setClockSource(fixedClock)
})

afterEach(() => {
  resetClock()
  defaultUiStore<string>(UI_STATE_KEYS.language).write('en')
  document.documentElement.removeAttribute('dir')
  document.documentElement.removeAttribute('lang')
})

function mount(path = '/financials/pricing?view=rate-card', row = pricingRow()) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShellProvider>
        <Routes>
          <Route path="/financials/pricing" element={<PricingScreen row={row} />} />
        </Routes>
      </ShellProvider>
    </MemoryRouter>,
  )
}

async function mountedAr(path?: string, row?: SubTabRoute) {
  arabic()
  const utils = mount(path, row)
  await waitFor(() =>
    expect(screen.getByRole('list', { name: ar('fin.pricing.rateCard.rail.heading') })).toBeTruthy(),
  )
  return utils
}

const paneAr = () => screen.getByRole('region', { name: /RC-\d{4}-\d{2}-\d{2}/ })
const surgeCardAr = () =>
  screen.getByText(ar('fin.pricing.surge.heading')).closest('[data-slot="card"]') as HTMLElement

describe('§13 — the view survives dir="rtl"', () => {
  it('the document is rtl and the block still renders its rail, its pane and both cards', async () => {
    await mountedAr()
    expect(document.documentElement.getAttribute('dir')).toBe('rtl')
    expect(document.documentElement.getAttribute('lang')).toBe('ar')

    expect(screen.getByRole('list', { name: ar('fin.pricing.rateCard.rail.heading') })).toBeTruthy()
    expect(paneAr()).toBeTruthy()
    expect(surgeCardAr()).toBeTruthy()
    expect(
      screen.getAllByText(ar('fin.pricing.surge.suspensions.heading')).length,
    ).toBeGreaterThan(0)
  })

  it('every direction is logical: no physical left/right class survives on the block', async () => {
    await mountedAr()
    const block = screen
      .getByRole('list', { name: ar('fin.pricing.rateCard.rail.heading') })
      .closest('[data-slot="card"]') as HTMLElement
    /* R4 — `ms-`/`me-`/`ps-`/`pe-`/`start-`/`end-`/`border-e`, never their
       physical twins. A class here is the only handle: a physical utility is
       invisible to the accessibility tree and lays out identically in jsdom. */
    const sides = ['l', 'r']
    const stems = ['m', 'p'].flatMap((axis) => sides.map((side) => axis + side + '-'))
    const physical = new RegExp(
      String.raw`(^|\s)(` +
        [...stems, ...sides.map((side) => 'border-' + side), 'text-left', 'text-right'].join('|') +
        ')',
    )
    for (const element of block.querySelectorAll<HTMLElement>('*')) {
      expect(
        element.className,
        `physical direction on <${element.tagName.toLowerCase()}>`,
      ).not.toMatch(physical)
    }
  })
})

describe('the keys the rebuild added resolve in Arabic, not through the English fallback', () => {
  it('the three surge window names render their Arabic, never a key and never the English', async () => {
    await mountedAr()
    const card = surgeCardAr()
    for (const key of [
      'fin.pricing.surge.window.morningRush',
      'fin.pricing.surge.window.eveningRush',
      'fin.pricing.surge.window.weekendEvening',
    ]) {
      /* Non-vacuity: the Arabic and the English differ, so `getByText` on the
         Arabic can only pass if the Arabic entry was the one that resolved. */
      expect(ar(key)).not.toBe(en(key))
      expect(within(card).getByText(ar(key)), `${key} in Arabic`).toBeTruthy()
      expect(card.textContent, `${key} is not the English`).not.toContain(en(key))
      expect(card.textContent, `${key} is not a raw key`).not.toContain(key)
    }
  })

  it('the two class names render their Arabic, which is F-RC-3 one type along', async () => {
    await mountedAr()
    const table = within(paneAr()).getAllByRole('table')[0] as HTMLElement
    for (const key of ['fin.pricing.rateCard.class.economy', 'fin.pricing.rateCard.class.comfort']) {
      expect(within(table).getByText(ar(key))).toBeTruthy()
    }
    /* The stored English is what an Arabic operator used to read here. */
    expect(table.textContent).not.toContain('Economy')
    expect(table.textContent).not.toContain('Comfort')
  })

  it('the strings the rebuild rewrote render their Arabic on the Arabic page', async () => {
    await mountedAr()
    for (const key of [
      'fin.pricing.stageA.title',
      'fin.pricing.rateCard.terms.heading',
      'fin.pricing.rateCard.stat.riderPrices',
      'fin.pricing.rateCard.floors.caption',
      'fin.pricing.rateCard.impact.change',
      'fin.pricing.surge.readOnly',
      'fin.pricing.surge.suspend.prompt',
    ]) {
      expect(ar(key), `${key} has an Arabic entry`).toBeTruthy()
      expect(document.body.textContent, `${key} in Arabic`).toContain(ar(key))
    }
  })

  it('the permission refusal resolves in Arabic, with the permission label interpolated', async () => {
    await switchMockUser('USR-4')
    await mountedAr()
    const primary = within(surgeCardAr()).getByRole('button', {
      name: ar('fin.pricing.surge.suspend.confirm'),
    })
    const reason = document.getElementById(primary.getAttribute('aria-describedby') ?? '')
    expect(reason?.textContent).toBe(
      ar('fin.pricing.blocked.permission').replace(
        '{permission}',
        ar('account.permission.manage_plans'),
      ),
    )
    expect(reason?.textContent).not.toContain('{permission}')
    expect(reason?.textContent).not.toContain('captain')
  })

  it('nothing on the Arabic view renders a raw key', async () => {
    await mountedAr()
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    const leaked: string[] = []
    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
      const text = (node.textContent ?? '').trim()
      if (/^(fin|view|state|table|account|queue)\.[a-z]/i.test(text)) leaked.push(text)
    }
    expect(leaked).toEqual([])
  })
})

describe('§13 — what mirrors, and what must not', () => {
  it('AC-73 — a money numeral keeps its character order and its bidi isolation', async () => {
    await mountedAr()
    const table = within(paneAr()).getAllByRole('table')[0] as HTMLElement
    /* The figures are byte-identical to the English page: only the label rung
       changes between languages, which is why D36's unit belongs in the head. */
    const first = within(table).getAllByText('5.00')[0] as HTMLElement
    expect(first.tagName.toLowerCase()).toBe('bdi')
    expect(table.textContent).toContain('1.20')
    expect(table.textContent).toContain('12.00')
  })

  it('the multiplier and the hour range are single isolated runs, so neither reorders', async () => {
    await mountedAr()
    const card = surgeCardAr()
    /* U+00D7 is bidi-neutral and `Bidi_Mirrored=No`, so `1.3×` is rendered as
       one `<bdi>` run rather than assembled around the glyph. */
    const multiplier = within(card).getByText('1.3×')
    expect(multiplier.tagName.toLowerCase()).toBe('bdi')
    expect(within(card).getByText('7–9').tagName.toLowerCase()).toBe('bdi')
  })

  it('AC-443 — the rail footer draws its separators and never writes them into a string', async () => {
    await mountedAr()
    const footer = screen
      .getByRole('list', { name: ar('fin.pricing.rateCard.rail.heading') })
      .nextElementSibling as HTMLElement
    expect(footer.tagName).toBe('P')
    const drawn = [...footer.querySelectorAll('[aria-hidden="true"]')]
    expect(drawn.length).toBeGreaterThan(0)
    for (const separator of drawn) expect(separator.textContent?.trim()).toBe('·')
    /* Each fragment is isolated, so an Arabic count and a Latin numeral do not
       swap sides across the separator. */
    expect(footer.querySelectorAll('bdi').length).toBe(drawn.length + 1)
  })
})
