/**
 * The route table's acceptance criteria, as a test rather than a comment.
 *
 * AC-03, AC-04 and AC-15 are meant to be mechanical — "QA diffs it against §3.4
 * and §3.5" (§8.5). A comment claiming the merge register is complete is worth
 * nothing; this file fails the build when a row is added, moved or mistyped.
 *
 * Owner: mock-data-engineer. If you are adding a sub-tab and this fails, the
 * table is wrong, not the test.
 */

import { describe, expect, it } from 'vitest'

import { ROUTE_TABLE, SHELL_LAYERS, SUB_TABS, WORKSPACES } from '../fixtures/routeTable'
import {
  LEGACY_PAGE_IDS,
  LEGACY_SETTINGS_PANE_KEYS,
  RETIRED_LEGACY_PAGE_IDS,
} from '../fixtures/legacyPages'
import { findSubTabByPath, resolveLegacyPage } from './routes'
import { WORKSPACE_IDS } from '../types/navigation'

describe('AC-01/AC-02 — the rail', () => {
  it('renders exactly 5 workspace targets', () => {
    expect(WORKSPACES).toHaveLength(5)
    expect(WORKSPACES.map((w) => w.id)).toEqual([...WORKSPACE_IDS])
  })

  it('pins Admin last, with the other four as one group above it', () => {
    const sorted = [...WORKSPACES].sort((a, b) => a.order - b.order)
    expect(sorted.at(-1)?.id).toBe('admin')
    expect(sorted.at(-1)?.pinnedToBottom).toBe(true)
    expect(sorted.slice(0, 4).every((w) => !w.pinnedToBottom)).toBe(true)
  })
})

describe('AC-03 — 34 sub-tabs, distributed 5/9/7/6/7, unique paths', () => {
  it('has exactly 34 sub-tab rows', () => {
    expect(SUB_TABS).toHaveLength(34)
  })

  it('distributes them 5 / 9 / 7 / 6 / 7', () => {
    const counts = WORKSPACE_IDS.map((id) => SUB_TABS.filter((r) => r.workspaceId === id).length)
    expect(counts).toEqual([5, 9, 7, 6, 7])
  })

  it('gives every sub-tab a unique path and a unique id', () => {
    expect(new Set(SUB_TABS.map((r) => r.path)).size).toBe(34)
    expect(new Set(SUB_TABS.map((r) => r.subTabId)).size).toBe(34)
  })

  it('numbers display order 1..n contiguously within each workspace', () => {
    for (const id of WORKSPACE_IDS) {
      const orders = SUB_TABS.filter((r) => r.workspaceId === id)
        .map((r) => r.order)
        .sort((a, b) => a - b)
      expect(orders).toEqual(orders.map((_, i) => i + 1))
    }
  })

  it('puts every sub-tab under its workspace route prefix', () => {
    for (const row of SUB_TABS) {
      const prefix = WORKSPACES.find((w) => w.id === row.workspaceId)!.routePrefix
      expect(row.path.startsWith(`${prefix}/`)).toBe(true)
    }
  })
})

describe('AC-04 — the merge register as data', () => {
  /**
   * The union is taken over **every route-table row**, sub-tabs *and* shell
   * layers, exactly as AC-04 words it. That matters: `profile`,
   * `notifications-all` and `my-account` are shell layers, not sub-tabs, so a
   * union over the 34 sub-tabs alone is 37, not 40. See the handoff note —
   * §8.5's "34 rows" and AC-04's "every row" are reconciled here, in favour of
   * AC-04, because otherwise three census ids have no home.
   */
  const unionAllRows = new Set([
    ...SUB_TABS.flatMap((r) => r.legacyPageIds),
    ...SHELL_LAYERS.flatMap((l) => l.legacyPageIds),
  ])

  it('covers 40 of the 41 census ids — the census minus `interventions`', () => {
    const expected = LEGACY_PAGE_IDS.filter((id) => !RETIRED_LEGACY_PAGE_IDS.includes(id))
    expect(expected).toHaveLength(40)
    expect([...unionAllRows].sort()).toEqual([...expected].sort())
  })

  it('leaves no census id absent', () => {
    const missing = LEGACY_PAGE_IDS.filter(
      (id) => !unionAllRows.has(id) && !RETIRED_LEGACY_PAGE_IDS.includes(id),
    )
    expect(missing).toEqual([])
  })

  it('references no id that is not in the census', () => {
    const strays = [...unionAllRows].filter((id) => !LEGACY_PAGE_IDS.includes(id as never))
    expect(strays).toEqual([])
  })

  it('places `interventions` in no row, and resolves it to no route (§3.11)', () => {
    expect(unionAllRows.has('interventions')).toBe(false)
    expect(resolveLegacyPage('interventions')).toEqual([])
    expect(findSubTabByPath('/queues/interventions')).toBeNull()
    expect(findSubTabByPath('/operations/interventions')).toBeNull()
  })

  it('records the three shell-layer ids explicitly, so the 34-vs-37 gap is visible', () => {
    const subTabOnly = new Set(SUB_TABS.flatMap((r) => r.legacyPageIds))
    const shellOnly = ['profile', 'notifications-all', 'my-account']
    expect(subTabOnly.size).toBe(37)
    for (const id of shellOnly) expect(subTabOnly.has(id)).toBe(false)
    expect(SHELL_LAYERS.flatMap((l) => l.legacyPageIds).sort()).toEqual([...shellOnly].sort())
  })
})

describe('AC-15 — all 21 settings panes reachable, none twice', () => {
  const claimed = SUB_TABS.flatMap((r) => r.legacySettingsPanes)

  it('reaches all 21', () => {
    expect([...claimed].sort()).toEqual([...LEGACY_SETTINGS_PANE_KEYS].sort())
  })

  it('claims none twice', () => {
    expect(claimed).toHaveLength(new Set(claimed).size)
  })

  it('routes 17 through Admin and 4 through Financials (§3.7)', () => {
    const byWorkspace = (id: string) =>
      SUB_TABS.filter((r) => r.workspaceId === id).flatMap((r) => r.legacySettingsPanes)
    expect(byWorkspace('admin')).toHaveLength(17)
    expect(byWorkspace('financials').sort()).toEqual(['cancelpolicy', 'gateways', 'ledger', 'pricing'])
  })
})

describe('AC-06 — every workspace opens on its Overview', () => {
  it('names an Overview as the default sub-tab, and it is order 1', () => {
    for (const workspace of WORKSPACES) {
      const target = SUB_TABS.find((r) => r.subTabId === workspace.defaultSubTabId)
      expect(target, `no sub-tab ${workspace.defaultSubTabId}`).toBeDefined()
      expect(target!.workspaceId).toBe(workspace.id)
      expect(target!.order).toBe(1)
      expect(target!.path).toBe(`${workspace.routePrefix}/overview`)
    }
  })
})

describe('§3.10 — page shapes', () => {
  /**
   * §3.10 says "32 of the 34". The arithmetic does not work: 34 sub-tabs minus
   * the one monitor (Live Dispatch) is **33**, because the full-bleed plan
   * editor is a level-3 detail route and not a sub-tab at all. 33 is asserted
   * here; the spec's 32 is a recorded finding for product-owner.
   */
  it('gives 33 of the 34 sub-tabs the single-column shape', () => {
    expect(SUB_TABS.filter((r) => r.shape === 'single')).toHaveLength(33)
    expect(SUB_TABS.filter((r) => r.shape === 'monitor').map((r) => r.subTabId)).toEqual([
      'operations-dispatch',
    ])
  })

  it('makes the plan editor the only full-bleed route', () => {
    const bleed = SUB_TABS.flatMap((r) => r.detailRoutes).filter((d) => d.shape === 'bleed')
    expect(bleed.map((d) => d.path)).toEqual(['/financials/pricing/plans/:planId/edit'])
  })

  it('declares exactly the five level-3 routes named in §3.4', () => {
    const kinds = [
      ...SUB_TABS.flatMap((r) => r.detailRoutes.map((d) => d.kind)),
      ...SHELL_LAYERS.filter((l) => l.fullPagePath).map(() => 'entity' as const),
    ]
    expect(kinds.sort()).toEqual(['applicant', 'corporate', 'entity', 'plan-editor', 'ticket'])
  })
})

describe('§3.8 — route resolution', () => {
  it('resolves a sub-tab path to its row (AC-09 precondition)', () => {
    expect(findSubTabByPath('/operations/people')?.subTabId).toBe('operations-people')
  })

  it('resolves a level-3 detail to its parent sub-tab (rule 2, AC-09)', () => {
    expect(findSubTabByPath('/operations/people/applications/APP-2201')?.subTabId).toBe(
      'operations-people',
    )
    expect(findSubTabByPath('/financials/pricing/plans/1/edit')?.subTabId).toBe('financials-pricing')
  })

  it('ignores the view param when resolving (rule 3, AC-10)', () => {
    expect(findSubTabByPath('/operations/requests?view=instant')?.subTabId).toBe('operations-requests')
  })

  it('resolves an unknown path to null, so the shell can render not-found (rule 5, AC-12)', () => {
    expect(findSubTabByPath('/nonsense/route')).toBeNull()
  })
})

describe('§4.3.4 — global search resolves legacy names', () => {
  it('sends "Renewal pipeline" to Operations › Subscriptions — Expiring ≤ 7 days', () => {
    const [hit] = resolveLegacyPage('Renewal pipeline')
    expect(hit).toMatchObject({
      subTabId: 'operations-subscriptions',
      path: '/operations/subscriptions',
      viewId: 'expiring-7d',
    })
  })

  it('sends "Cancellation Policy" to Financials › Pricing & Plans', () => {
    const pane = SUB_TABS.find((r) => r.legacySettingsPanes.includes('cancelpolicy'))
    expect(pane?.path).toBe('/financials/pricing')
    expect(pane?.views.map((v) => v.id)).toContain('cancellation-fees')
  })

  it('returns every destination of a Split page rather than picking one', () => {
    const hits = resolveLegacyPage('exec-overview').map((h) => h.subTabId)
    expect(hits.sort()).toEqual(['management-overview', 'management-performance', 'management-zones'])
  })
})

describe('recorded gaps — these fail on purpose until a human answers', () => {
  /**
   * AC-61: every one of the 34 sub-tabs needs a permission. **Q4 is open** —
   * the rule is decided (§11.3), the values are not. This test asserts the
   * *current, recorded* state so the gap cannot be forgotten; when Q4 lands,
   * invert it to `toBe(0)` and it becomes AC-61 proper.
   */
  it('Q4: all 34 sub-tab permissions are still null', () => {
    const unresolved = SUB_TABS.filter((r) => r.permission === null)
    expect(unresolved).toHaveLength(34)
  })

  it('the 360° profile layer is the one permission the spec already fixed', () => {
    const profile = SHELL_LAYERS.find((l) => l.layerId === 'entity')
    expect(profile?.permission).toEqual({ key: 'view_profiles', level: 'full' })
  })
})

describe('§8.4 — count badges', () => {
  it('marks every sub-tab that owns a backlog, and no Overview does', () => {
    const backlogs = SUB_TABS.filter((r) => r.hasBacklog)
    expect(backlogs.length).toBeGreaterThan(0)
    for (const row of SUB_TABS) {
      if (row.path.endsWith('/overview') && row.workspaceId !== 'admin') {
        expect(row.hasBacklog, `${row.subTabId} is an Overview and must not carry a count`).toBe(false)
      }
    }
  })
})

describe('table integrity', () => {
  it('gives every sub-tab a title key and at least one pattern', () => {
    for (const row of SUB_TABS) {
      expect(row.titleKey, row.subTabId).toMatch(/^subtab\./)
      expect(row.patterns.length, row.subTabId).toBeGreaterThan(0)
    }
  })

  it('points every detail route at a sub-tab that exists', () => {
    const ids = new Set(SUB_TABS.map((r) => r.subTabId))
    for (const detail of SUB_TABS.flatMap((r) => r.detailRoutes)) {
      expect(ids.has(detail.parentSubTabId), detail.path).toBe(true)
    }
  })

  it('gives every view set exactly one default', () => {
    for (const row of SUB_TABS) {
      if (row.views.length === 0) continue
      expect(row.views.filter((v) => v.isDefault), row.subTabId).toHaveLength(1)
      expect(new Set(row.views.map((v) => v.id)).size).toBe(row.views.length)
    }
  })

  it('exposes the whole table through one object', () => {
    expect(ROUTE_TABLE.subTabs).toBe(SUB_TABS)
    expect(ROUTE_TABLE.shellLayers).toBe(SHELL_LAYERS)
    expect(ROUTE_TABLE.retiredLegacyPageIds).toEqual(['interventions'])
  })
})
