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
  PAGE_ALIAS_IDS,
  SETTINGS_PANE_KEYS,
  RETIRED_PAGE_ALIAS_IDS,
} from '../fixtures/pageAliases'
import { REPORTS_SUB_TAB_ID, REPORTS_VIEWS } from '@/screens/reports'
import { findSubTabByPath, resolvePageAlias, subTabViewPermissions } from './routes'
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

describe('AC-03 — 37 sub-tabs, distributed 6/11/7/6/7, unique paths', () => {
  /**
   * **AC-03 was written for 34; the table now holds 36.** `D1a` admitted
   * `management-reports` (Management 6, total 35). **`D1b` splits Operations >
   * Trips into `operations-quick-rides` and `operations-subscription-trips`** on
   * the business owner's ruling, so Operations is 10 and the total is 36.
   *
   * The numbers are updated rather than the assertion softened to `>= 34`: a
   * count test that cannot fail is not a count test.
   */
  it('has exactly 36 sub-tab rows', () => {
    expect(SUB_TABS).toHaveLength(37)
  })

  it('distributes them 6 / 10 / 7 / 6 / 7', () => {
    const counts = WORKSPACE_IDS.map((id) => SUB_TABS.filter((r) => r.workspaceId === id).length)
    expect(counts).toEqual([6, 11, 7, 6, 7])
  })

  it('gives every sub-tab a unique path and a unique id', () => {
    expect(new Set(SUB_TABS.map((r) => r.path)).size).toBe(37)
    expect(new Set(SUB_TABS.map((r) => r.subTabId)).size).toBe(37)
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
    ...SUB_TABS.flatMap((r) => r.pageAliasIds),
    ...SHELL_LAYERS.flatMap((l) => l.pageAliasIds),
  ])

  it('covers 40 of the 41 census ids — the census minus `interventions`', () => {
    const expected = PAGE_ALIAS_IDS.filter((id) => !RETIRED_PAGE_ALIAS_IDS.includes(id))
    expect(expected).toHaveLength(40)
    expect([...unionAllRows].sort()).toEqual([...expected].sort())
  })

  it('leaves no census id absent', () => {
    const missing = PAGE_ALIAS_IDS.filter(
      (id) => !unionAllRows.has(id) && !RETIRED_PAGE_ALIAS_IDS.includes(id),
    )
    expect(missing).toEqual([])
  })

  it('references no id that is not in the census', () => {
    const strays = [...unionAllRows].filter((id) => !PAGE_ALIAS_IDS.includes(id as never))
    expect(strays).toEqual([])
  })

  it('places `interventions` in no row, and resolves it to no route (§3.11)', () => {
    expect(unionAllRows.has('interventions')).toBe(false)
    expect(resolvePageAlias('interventions')).toEqual([])
    expect(findSubTabByPath('/queues/interventions')).toBeNull()
    expect(findSubTabByPath('/operations/interventions')).toBeNull()
  })

  it('records the three shell-layer ids explicitly, so the 34-vs-37 gap is visible', () => {
    const subTabOnly = new Set(SUB_TABS.flatMap((r) => r.pageAliasIds))
    const shellOnly = ['profile', 'notifications-all', 'my-account']
    expect(subTabOnly.size).toBe(37)
    for (const id of shellOnly) expect(subTabOnly.has(id)).toBe(false)
    expect(SHELL_LAYERS.flatMap((l) => l.pageAliasIds).sort()).toEqual([...shellOnly].sort())
  })
})

describe('AC-15 — all 21 settings panes reachable, none twice', () => {
  const claimed = SUB_TABS.flatMap((r) => r.settingsPanes)

  it('reaches all 21', () => {
    expect([...claimed].sort()).toEqual([...SETTINGS_PANE_KEYS].sort())
  })

  it('claims none twice', () => {
    expect(claimed).toHaveLength(new Set(claimed).size)
  })

  it('routes 17 through Admin and 4 through Financials (§3.7)', () => {
    const byWorkspace = (id: string) =>
      SUB_TABS.filter((r) => r.workspaceId === id).flatMap((r) => r.settingsPanes)
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
   * §3.10 says "32 of the 34". The arithmetic never worked: 34 sub-tabs minus
   * the one monitor (Live Dispatch) is **33**, because the full-bleed plan
   * editor is a level-3 detail route and not a sub-tab at all. The spec's 32
   * stays a recorded finding for product-owner.
   *
   * **D1a moves both numbers by one** — `management-reports` is `single`, so it
   * is 34 of 35 now. The invariant the test actually guards is unchanged and is
   * the reason it is written as two assertions rather than one: **every sub-tab
   * is single-column except Live Dispatch**, which is a monitor.
   */
  it('gives 36 of the 37 sub-tabs the single-column shape', () => {
    expect(SUB_TABS.filter((r) => r.shape === 'single')).toHaveLength(36)
    expect(SUB_TABS.filter((r) => r.shape === 'monitor').map((r) => r.subTabId)).toEqual([
      'operations-dispatch',
    ])
  })

  it('makes the two pricing editors, each with its create form, the only full-bleed routes', () => {
    const bleed = SUB_TABS.flatMap((r) => r.detailRoutes).filter((d) => d.shape === 'bleed')
    expect(bleed.map((d) => d.path)).toEqual([
      '/financials/pricing/plans/:planId/edit',
      '/financials/pricing/plans/new',
      '/financials/pricing/quick-rides/:typeId/edit',
      '/financials/pricing/quick-rides/new',
    ])
  })

  /**
   * §3.4 named five. **D1a adds two** — `report` and `dashboard` — because a
   * saved report and a dashboard each address one named record, which `?view=`
   * cannot carry (§3.8 rule 3).
   *
   * **D19 adds an eighth, `conversation`, and it arrived by correcting a
   * mistake worth recording.** The conversation pane was first built as a
   * drawer — not on a design argument, but because this row declared
   * `detailRoutes: []` and `routes.tsx` has a single owner, so a drawer was the
   * only surface reachable without touching another agent's file. A
   * file-ownership constraint had decided a page shape.
   *
   * On the design: `--ev-drawer-w` is 406px and cannot hold a thread, a 320px
   * rail and a pinned composer at once — and the rail carries §8.4.2's
   * countdown, which both D22's SLA and its concurrent-chat cap are read from.
   * §5.0's drawer is *"a surface consulted against the page behind it"*, and at
   * a 45-second first-response promise an operator is in the conversation for
   * twenty minutes.
   */
  it('declares exactly the eleven level-3 routes — §3.4’s five, D1a’s two, D19’s one, S-7’s one, S-8’s two', () => {
    const kinds = [
      ...SUB_TABS.flatMap((r) => r.detailRoutes.map((d) => d.kind)),
      ...SHELL_LAYERS.filter((l) => l.fullPagePath).map(() => 'entity' as const),
    ]
    expect(kinds.sort()).toEqual([
      'applicant',
      'conversation',
      'corporate',
      'dashboard',
      'dispute',
      'entity',
      'fairness-case',
      'incident',
      'plan-editor',
      'plan-editor',
      'quick-ride-editor',
      'quick-ride-editor',
      'report',
      'ticket',
    ])
  })
})

describe('D1a — the Report Builder row', () => {
  const reports = SUB_TABS.find((r) => r.subTabId === REPORTS_SUB_TAB_ID)

  it('sits in Management at order 6, on /management/reports', () => {
    expect(reports, 'no management-reports row').toBeDefined()
    expect(reports!.workspaceId).toBe('management')
    expect(reports!.order).toBe(6)
    expect(reports!.path).toBe('/management/reports')
  })

  /**
   * **The drift guard, and the reason the duplication is tolerable.**
   *
   * `ReportsScreen` carries its own `VIEWS` list because it was built while the
   * row did not exist and had to name itself. Two sources for one fact is a
   * defect waiting to happen, so this pins them together: the day someone adds
   * a fourth view to either side without the other, this fails by name.
   *
   * It asserts the ORDER too, not just the set — the view tabs render in
   * `order`, and a screen listing them differently would put the default in the
   * wrong place.
   */
  it('declares the same three views, in the same order, as the screen', () => {
    const declared = [...reports!.views].sort((a, b) => a.order - b.order).map((v) => v.id)
    expect(declared).toEqual([...REPORTS_VIEWS])
  })

  it('makes `reports` the default view', () => {
    expect(reports!.views.filter((v) => v.isDefault).map((v) => v.id)).toEqual(['reports'])
  })

  /**
   * §12.6 — a report is a question, not a queue, so there is nothing to badge.
   * Asserted rather than assumed because `hasBacklog: true` would put an empty
   * chip in the rail claiming a backlog that cannot exist.
   */
  it('carries no backlog badge', () => {
    expect(reports!.hasBacklog).toBe(false)
  })

  /** Both level-3 routes resolve back to this row (§3.8 rule 2). */
  it('resolves a saved report and a dashboard to the sub-tab', () => {
    expect(findSubTabByPath('/management/reports/REP-1')?.subTabId).toBe(REPORTS_SUB_TAB_ID)
    expect(findSubTabByPath('/management/reports/dashboards/DASH-1')?.subTabId).toBe(
      REPORTS_SUB_TAB_ID,
    )
  })

  /**
   * The ordering hazard the fixture comment names: `:reportId` would swallow
   * `/dashboards/DASH-1` by matching `dashboards` as an id. This asserts the
   * dashboard path resolves to the **dashboard** route and not to the saved
   * report one — the distinction `detailScreenFor` branches on.
   */
  it('does not let :reportId swallow the dashboard path', () => {
    const row = findSubTabByPath('/management/reports/dashboards/DASH-1')
    const match = row?.detailRoutes.find((d) =>
      new RegExp(`^${d.path.replace(/:[A-Za-z]+/g, '[^/]+')}$`).test(
        '/management/reports/dashboards/DASH-1',
      ),
    )
    expect(match?.paramName).toBe('dashboardId')
  })

  /** It is genuinely new — AC-04 requires census ids in a row, not rows in the census. */
  it('claims no legacy page', () => {
    expect(reports!.pageAliasIds).toEqual([])
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
    /* Operations gained a row when Requests split by channel into
       `operations-ride-requests` and `operations-subscription-requests`. The view param is still ignored; what changed is
       which path carries the channel. */
    expect(findSubTabByPath('/operations/ride-requests?view=needs-decision')?.subTabId).toBe(
      'operations-ride-requests',
    )
  })

  it('resolves an unknown path to null, so the shell can render not-found (rule 5, AC-12)', () => {
    expect(findSubTabByPath('/nonsense/route')).toBeNull()
  })
})

describe('§4.3.4 — global search resolves legacy names', () => {
  it('sends "Renewal pipeline" to Operations › Subscriptions — Expiring ≤ 7 days', () => {
    const [hit] = resolvePageAlias('Renewal pipeline')
    expect(hit).toMatchObject({
      subTabId: 'operations-subscriptions',
      path: '/operations/subscriptions',
      viewId: 'expiring-7d',
    })
  })

  it('sends "Cancellation Policy" to Financials › Pricing & Plans', () => {
    const pane = SUB_TABS.find((r) => r.settingsPanes.includes('cancelpolicy'))
    expect(pane?.path).toBe('/financials/pricing')
    expect(pane?.views.map((v) => v.id)).toContain('cancellation-fees')
  })

  it('returns every destination of a Split page rather than picking one', () => {
    const hits = resolvePageAlias('exec-overview').map((h) => h.subTabId)
    expect(hits.sort()).toEqual(['management-overview', 'management-performance', 'management-zones'])
  })
})

describe('AC-61 / AC-919 — every row carries its two permission keys (D17)', () => {
  /**
   * **This test used to assert the gap.** It read *"Q4: all 35 sub-tab
   * permissions are still null"* and passed. D17 closed Q4, so it is inverted
   * here rather than deleted: the shape of the old assertion is the record of
   * what was wrong.
   */
  it('leaves no row unresolved: 34 of 35 carry a view key', () => {
    const unresolved = SUB_TABS.filter((r) => r.viewPermission === null)
    expect(unresolved.map((r) => r.subTabId)).toEqual(['admin-activity'])
  })

  /** **AC-919** — asserted as an exact identity, not as a count. */
  it('names admin-activity as the ONLY row with no view key, and says why', () => {
    /* Every authenticated operator can open the Activity Log; its rows are
       filtered server-side to entities the operator can otherwise see. An audit
       trail only the accused can hide is not a control. */
    const activity = SUB_TABS.find((r) => r.subTabId === 'admin-activity')
    expect(activity?.viewPermission).toBeNull()
    expect(activity?.writePermission).toBeNull()
    expect(SUB_TABS.filter((r) => r.viewPermission === null)).toHaveLength(1)
  })

  it('declares a write key on every row that has write actions, and null on the boards', () => {
    /* `writePermission: null` is a claim — "this sub-tab has nothing to write" —
       and `canWriteSubTab` returns FALSE for it. The rows entitled to make that
       claim are the four Overview boards plus Performance and the Activity Log;
       anything else with a null write key is a row missing its key. */
    const noWrite = SUB_TABS.filter((r) => r.writePermission === null).map((r) => r.subTabId)
    expect(noWrite).toEqual([
      'management-overview',
      'management-performance',
      'operations-overview',
      'financials-overview',
      'support-overview',
      'admin-overview',
      'admin-activity',
    ])
  })

  it('gates admin-team on its own write key, not on view_admin', () => {
    /* Read-only access to Team & Access exposes the operator roster, everyone's
       second-factor state and the whole permission matrix. There is no useful
       read-only for it (D17). */
    const team = SUB_TABS.find((r) => r.subTabId === 'admin-team')
    expect(team?.viewPermission).toBe('manage_team')
    expect(team?.writePermission).toBe('manage_team')
  })

  it('keeps the two self-gating rows self-gating', () => {
    const selfGating = SUB_TABS.filter(
      (r) => r.writePermission !== null && r.writePermission === r.viewPermission,
    ).map((r) => r.subTabId)
    expect(selfGating.sort()).toEqual(['admin-team', 'management-reports', 'operations-my-work'])
  })

  it('gates every row on its own workspace read key, bar admin-team and admin-activity', () => {
    const expected: Record<string, string> = {
      management: 'view_analytics',
      operations: 'view_operations',
      financials: 'view_finance',
      support: 'view_support',
      admin: 'view_admin',
    }
    for (const row of SUB_TABS) {
      if (row.subTabId === 'admin-team' || row.subTabId === 'admin-activity') continue
      expect(row.viewPermission, row.subTabId).toBe(expected[row.workspaceId])
    }
  })

  it('the 360° profile layer is gated on view_profiles', () => {
    const profile = SHELL_LAYERS.find((l) => l.layerId === 'entity')
    expect(profile?.viewPermission).toBe('view_profiles')
    /* The other three layers open for every authenticated operator. */
    const open = SHELL_LAYERS.filter((l) => l.viewPermission === null).map((l) => l.layerId)
    expect(open.sort()).toEqual(['account', 'notifications', 'onboarding'])
  })

  it('AC-925 — no route-table row is gated on the retired manage_settings', () => {
    const keys = SUB_TABS.flatMap((r) => [r.viewPermission, r.writePermission])
    expect(keys).not.toContain('manage_settings')
  })
})

describe('subTabViewPermissions — the derived §8.2 map', () => {
  it('has one entry per sub-tab and cannot disagree with the table', () => {
    const map = subTabViewPermissions()
    expect(Object.keys(map).sort()).toEqual(SUB_TABS.map((r) => r.subTabId).sort())
    for (const row of SUB_TABS) {
      expect(map[row.subTabId], row.subTabId).toEqual(
        row.viewPermission === null ? [] : [row.viewPermission],
      )
    }
  })

  it('gives admin-activity an EMPTY array, which means ungated and not absent', () => {
    /* §8.2's contract: `[]` = the server says this row is open; a missing key =
       the server did not say, and `isSubTabVisible` falls back to the row. */
    expect(subTabViewPermissions()['admin-activity']).toEqual([])
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
    expect(ROUTE_TABLE.retiredPageAliasIds).toEqual(['interventions'])
  })
})
