/**
 * `resolveRoute` — the derivation both nav columns, the back arrow, the page
 * shape and the shell layers read from. **AC-08 through AC-13, AC-21, AC-22.**
 *
 * These are unit tests on a pure function, deliberately, because the criteria
 * they cover are about the URL and not about the DOM:
 *
 * > **AC-08** — navigating by any means other than clicking a nav row leaves the
 * > rail and sub-tab list highlighting the **destination** route, never the
 * > origin.
 *
 * A component test could only ever assert that for the paths it happened to
 * click. `resolveRoute` takes a pathname and a search string, so every path in
 * the route table can be checked at once — and there is no third input a
 * handler could have influenced, which is the actual content of AC-08.
 */

import { describe, expect, it } from 'vitest'
import { getRouteTable } from '@/data/clients'
import { matchPattern, normalisePath, resolveRoute, withOverlay, withView } from './routeState'

const table = getRouteTable()

describe('resolveRoute — the two nav columns are derived from the URL (AC-08)', () => {
  it('resolves every one of the 34 sub-tab paths to its own row and workspace', () => {
    for (const row of table.subTabs) {
      const state = resolveRoute(row.path, '')
      expect(state.subTabId, row.path).toBe(row.subTabId)
      expect(state.workspaceId, row.path).toBe(row.workspaceId)
      expect(state.isNotFound, row.path).toBe(false)
    }
  })

  it('takes the page shape from the route table, never from the screen', () => {
    for (const row of table.subTabs) {
      expect(resolveRoute(row.path, '').shape, row.path).toBe(row.shape)
    }
  })

  it('ignores a trailing slash rather than treating it as a different route', () => {
    expect(resolveRoute('/operations/people/', '').subTabId).toBe('operations-people')
  })
})

describe('level-3 details highlight their PARENT sub-tab (AC-09)', () => {
  it('/operations/people/applications/APP-2201 highlights Operations → People', () => {
    const state = resolveRoute('/operations/people/applications/APP-2201', '')
    expect(state.workspaceId).toBe('operations')
    expect(state.subTabId).toBe('operations-people')
    expect(state.detailKind).toBe('applicant')
    expect(state.params.applicantId).toBe('APP-2201')
  })

  it('shows the back arrow on a detail and NOT on a sub-tab index (§4 slot 1)', () => {
    expect(resolveRoute('/operations/people/applications/APP-2201', '').showsBackArrow).toBe(true)
    expect(resolveRoute('/operations/people', '').showsBackArrow).toBe(false)
  })

  it('marks the plan editor as bleed — the one route that unmounts the shell (AC-13)', () => {
    const state = resolveRoute('/financials/pricing/plans/1/edit', '')
    expect(state.isBleed).toBe(true)
    expect(state.shape).toBe('bleed')
    /* It still highlights Pricing & Plans, which is what makes exit restore
       both columns with the right row selected (§7.3). */
    expect(state.subTabId).toBe('financials-pricing')
  })

  it('resolves every detail route in the table without a hand-written path', () => {
    for (const row of table.subTabs) {
      for (const detail of row.detailRoutes) {
        const concrete = detail.path.replace(/:([A-Za-z]+)/g, 'X-1')
        const state = resolveRoute(concrete, '')
        expect(state.subTabId, detail.path).toBe(row.subTabId)
        expect(state.detailKind, detail.path).toBe(detail.kind)
      }
    }
  })
})

describe('a view is a control, not a level (AC-10)', () => {
  it('reads ?view= without changing either column', () => {
    const plain = resolveRoute('/operations/requests', '')
    const viewed = resolveRoute('/operations/requests', '?view=instant')
    expect(viewed.view).toBe('instant')
    expect(viewed.workspaceId).toBe(plain.workspaceId)
    expect(viewed.subTabId).toBe(plain.subTabId)
  })

  it('leaves the view untouched when a layer opens over it', () => {
    const search = withOverlay('?view=instant', 'entity', 'RDR-1041')
    const state = resolveRoute('/operations/requests', search)
    expect(state.view).toBe('instant')
    expect(state.overlay).toBe('entity')
  })
})

describe('route-not-found keeps the last valid workspace (AC-12)', () => {
  it('flags an unknown path without inventing a sub-tab', () => {
    const state = resolveRoute('/nonsense/route', '')
    expect(state.isNotFound).toBe(true)
    expect(state.subTabId).toBeNull()
    /* The URL is what it is. `resolveRoute` returns the path it was given — it
       never rewrites, because AC-12 says the URL is not rewritten. */
    expect(state.path).toBe('/nonsense/route')
  })

  it('keeps the workspace selected when the first segment still names one', () => {
    const state = resolveRoute('/operations/nonsense', '')
    expect(state.isNotFound).toBe(true)
    expect(state.workspaceId).toBe('operations')
  })

  it('highlights nothing when there is no last valid workspace to keep', () => {
    expect(resolveRoute('/nonsense/route', '').workspaceId).toBeNull()
  })

  it('does not resolve `interventions`, which is retired (§3.11)', () => {
    for (const variant of ['/interventions', '/operations/interventions', '/interventions/live']) {
      expect(resolveRoute(variant, '').isNotFound, variant).toBe(true)
    }
  })
})

describe('shell layers are an overlay param, never a route (AC-21, AC-22)', () => {
  it('reads each of the three params', () => {
    expect(resolveRoute('/support/tickets', '?entity=RDR-1041').overlay).toBe('entity')
    expect(resolveRoute('/support/tickets', '?notifications=all').overlay).toBe('notifications')
    expect(resolveRoute('/support/tickets', '?account=me').overlay).toBe('account')
  })

  it('keeps the underlying route resolved while a layer is open (AC-20)', () => {
    const state = resolveRoute('/support/tickets/TKT-505', '?entity=RDR-1041')
    expect(state.workspaceId).toBe('support')
    expect(state.subTabId).toBe('support-tickets')
    expect(state.overlayValue).toBe('RDR-1041')
  })

  it('opens exactly ONE layer even from a hand-typed URL carrying two', () => {
    const state = resolveRoute('/support/tickets', '?entity=RDR-1041&account=me')
    expect(state.overlay).toBe('entity')
  })

  it('withOverlay deletes the other two params — this is AC-22', () => {
    const first = withOverlay('', 'entity', 'RDR-1041')
    const second = withOverlay(first, 'notifications', 'all')
    expect(second).not.toContain('entity=')
    expect(second).toContain('notifications=all')
    const closed = withOverlay(second, null, '')
    expect(closed).toBe('')
  })

  it('withOverlay preserves every other param, ?view= included (AC-10)', () => {
    const search = withOverlay('?view=instant&q=nora', 'account', 'me')
    const params = new URLSearchParams(search)
    expect(params.get('view')).toBe('instant')
    expect(params.get('q')).toBe('nora')
    expect(params.get('account')).toBe('me')
  })
})

describe('the profile full-page escape belongs to no workspace (§6.2)', () => {
  it('resolves /entity/:entityId as a detail with no workspace highlighted', () => {
    const state = resolveRoute('/entity/RDR-1041', '')
    expect(state.isNotFound).toBe(false)
    expect(state.shape).toBe('detail')
    expect(state.showsBackArrow).toBe(true)
    expect(state.workspaceId).toBeNull()
    expect(state.params.entityId).toBe('RDR-1041')
  })
})

describe('withView — a view never becomes a path segment (§3.8 rule 3)', () => {
  it('sets, replaces and clears', () => {
    expect(withView('', 'instant')).toBe('?view=instant')
    expect(withView('?view=all', 'instant')).toBe('?view=instant')
    expect(withView('?view=all', null)).toBe('')
  })
})

describe('matchPattern and normalisePath', () => {
  it('requires the segment counts to agree — a prefix is not a match', () => {
    expect(matchPattern('/a/:id', '/a/1/2')).toBeNull()
    expect(matchPattern('/a/:id', '/a')).toBeNull()
    expect(matchPattern('/a/:id', '/a/1')).toEqual({ id: '1' })
  })

  it('decodes a param', () => {
    expect(matchPattern('/e/:id', '/e/RDR%2D1')).toEqual({ id: 'RDR-1' })
  })

  it('normalises the root and trailing slashes', () => {
    expect(normalisePath('/')).toBe('/')
    expect(normalisePath('/a/b/')).toBe('/a/b')
    expect(normalisePath('')).toBe('/')
  })
})
