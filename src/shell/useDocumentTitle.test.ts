/**
 * The document title is the only thing a screen reader announces on every
 * navigation and the only thing that tells two tabs apart. It was the literal
 * `Eyvar Admin` on all 34 routes, with zero writers in `src/`.
 */

import { describe, expect, it } from 'vitest'
import { EN } from '@/i18n/dictionaries'
import { getRouteTable } from '@/data/clients'
import { resolveRoute } from './routeState'
import { documentTitleFor } from './useDocumentTitle'

const t = ((key: string) => (EN as Record<string, string>)[key] ?? key) as never

describe('document.title names the route', () => {
  const table = getRouteTable()

  it('gives every sub-tab route a distinct title', () => {
    const titles = table.subTabs.map((row) => documentTitleFor(resolveRoute(row.path, ''), t))
    const duplicated = titles.filter((title, i) => titles.indexOf(title) !== i)
    expect(duplicated, 'two routes cannot share a title').toEqual([])
    expect(titles).toHaveLength(table.subTabs.length)
  })

  it('puts the most specific part first, because a tab strip truncates the end', () => {
    const row = table.subTabs.find((r) => r.path === '/financials/payouts')
    expect(row, 'the payouts route').toBeDefined()
    const title = documentTitleFor(resolveRoute(row!.path, ''), t)
    expect(title.startsWith(EN[row!.titleKey] as string)).toBe(true)
    expect(title.endsWith('Eyvar Admin')).toBe(true)
  })

  it('never repeats a segment', () => {
    for (const row of table.subTabs) {
      const parts = documentTitleFor(resolveRoute(row.path, ''), t).split(' · ')
      expect(new Set(parts).size, `${row.path} repeats a segment`).toBe(parts.length)
    }
  })

  /* AC-10 — a layer changes neither column's highlight, so it is not a
     navigation and must not rename the tab. Closing it would otherwise have to
     rename it back. */
  it('does not rename the page when a shell layer is open', () => {
    const path = '/operations/quick-rides'
    const plain = documentTitleFor(resolveRoute(path, ''), t)
    for (const search of ['?entity=DRV-0101', '?account=me', '?notifications=all']) {
      expect(documentTitleFor(resolveRoute(path, search), t)).toBe(plain)
    }
  })

  it('resolves through keys, so it translates with everything else', () => {
    for (const row of table.subTabs) {
      const title = documentTitleFor(resolveRoute(row.path, ''), t)
      expect(title, `${row.path} rendered a raw key`).not.toMatch(/^[a-z]+\.[a-z]/i)
    }
  })
})
