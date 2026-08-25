/**
 * **Operations › People** — merge **M7**, the widest of the seven
 * (`spec §3.6`): `drivers` + `all-pending` + `applicant-detail` + `compliance`
 * + `riders`, five legacy pages on one route.
 *
 * §5.1's union-of-patterns note is what makes it buildable: *"the component
 * set a single sub-tab needs is the union of its patterns"*. People carries
 * **P1** (index table), **P8** (work queue) and **P2** (the level-3 detail,
 * which is a separate route). §9.4 turns that into one mechanical rule:
 *
 * > `DataTable` takes a `mode` — `index | ledger | queue` — and **the mode,
 * > not the route, decides which furniture renders. A route may mount more
 * > than one mode over its lifetime. It may never mount two at once.**
 *
 * So this screen is a tab row and **one** mounted view:
 *
 * | View | Mode | Furniture |
 * |---|---|---|
 * | `Captains` | `index` | checkbox column, kebab, sort popover, bulk bar |
 * | `Applications` | `queue` | no checkbox, owner chip, SLA, dispositions, R5a |
 * | `Compliance` | `index` | checkbox column, kebab, sort popover, bulk bar |
 * | `Riders` | `index` | checkbox column, kebab, sort popover, bulk bar |
 *
 * Rules applied
 *   §3.8 rule 3 / AC-10
 *              the view is `?view=` — **a control, never a path segment**, and
 *              it changes neither nav column's highlight. The four ids and
 *              their labels come from the ROUTE TABLE (`row.views`), not from
 *              a list here, so re-ordering or renaming a view is a data change.
 *   §9.4       switching views **replaces the whole card body, including the
 *              header row**; the toolbar shape persists. Each view is its own
 *              component, so switching unmounts the previous table — which is
 *              **AC-25** (selection cannot survive) by construction.
 *   §8 slot 1  **no back arrow**: this is an index route (§2.2).
 *   §8 / V4    the `meta` line is the mounted view's **record count**, reported
 *              up from the table's own read. It is derived from the data on
 *              screen, which is the whole test V4 sets; the route table's
 *              `subtitleKey` is a description and is deliberately NOT rendered
 *              here — the top bar already carries it, and a line that cannot
 *              change when the data changes does not belong in the header.
 *   §8 slot 4  no page-level action cluster. Every action People offers acts
 *              on rows — a header primary would have to invent a create flow
 *              that has no client behind it, and R3's one primary is better
 *              spent nowhere than spent on a button that cannot work.
 *   §11.4      the queue's critical banner is the **view's**, not the route's:
 *              it renders inside `ApplicationsView`, as the first element of
 *              the content block, and is absent on the other three (§9.4).
 *              There is never more than one page-level banner (R10).
 *   §7.1       ONE page width, every route: `SingleColumnPage` no longer takes
 *              a `width` prop, so the page header lands in the same place on
 *              every sub-tab.
 *   §11.2      `approve_drivers` is resolved ONCE, here, and passed down. A
 *              control the role cannot use renders disabled in place.
 */

import { useCallback, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { SubTabRoute } from '@/data/types'
import { formatCount } from '@/lib'
import { PageHeader } from '@/components/PageHeader'
import { SingleColumnPage } from '@/components/PageShell'
import { useShell } from '@/shell/ShellContext'
import { useRouteState, withView } from '@/shell/routeState'
import { ApplicationsView } from './ApplicationsView'
import { CaptainsView } from './CaptainsView'
import { ComplianceView } from './ComplianceView'
import { RidersView } from './RidersView'
import {
  VIEW_APPLICATIONS,
  VIEW_CAPTAINS,
  VIEW_COMPLIANCE,
  VIEW_RIDERS,
  type ViewChrome,
} from './views'

export function PeopleScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  const route = useRouteState()
  const location = useLocation()
  const navigate = useNavigate()
  const { t, dir, language } = shell.language

  /* The route table declares the four views and their order (§3.8 rule 3). */
  const views = [...row.views].sort((a, b) => a.order - b.order)
  const fallback = views.find((view) => view.isDefault)?.id ?? VIEW_CAPTAINS
  const activeTab = views.some((view) => view.id === route.view) ? (route.view as string) : fallback

  /* §8's `meta` line — the mounted view's own record count, reported upwards.
     `useCallback` so the effect that reports it does not re-run every render. */
  const [total, setTotal] = useState<number | null>(null)
  const onTotal = useCallback((next: number | null) => setTotal(next), [])

  const chrome: ViewChrome = {
    chrome: {
      tabs: views.map((view) => ({ id: view.id, label: t(view.titleKey) })),
      activeTab,
      onSelectTab: (id) =>
        navigate({ pathname: location.pathname, search: withView(location.search, id) }),
      onTotal,
    },
    t,
    language,
    /* §11.2 — gate at RENDER. Resolved once and passed down, so two views
       cannot disagree about what the operator may do. */
    canWrite: shell.permissions.permissions.includes('approve_drivers'),
    currentUserId: shell.session?.userId ?? '',
  }

  /* One key per noun, and a singular key beside every plural one — there is no
     plural engine and Arabic has six categories (`translate.ts`). */
  const meta = useMemo(() => {
    if (total === null) return null
    const count = formatCount(total, language)
    const noun =
      activeTab === VIEW_APPLICATIONS
        ? 'applications'
        : activeTab === VIEW_COMPLIANCE
          ? 'compliance'
          : activeTab === VIEW_RIDERS
            ? 'riders'
            : 'captains'
    return t(`people.meta.${noun}.${total === 1 ? 'one' : 'other'}`, { count })
  }, [activeTab, language, t, total])

  return (
    <SingleColumnPage
      header={<PageHeader title={t(row.titleKey)} meta={meta} t={t} dir={dir} />}
    >
      {/* One mode at a time — §9.4. The `key` is belt and braces: these are
          four different components, so React unmounts on switch regardless. */}
      {activeTab === VIEW_APPLICATIONS ? (
        <ApplicationsView key={VIEW_APPLICATIONS} {...chrome} />
      ) : activeTab === VIEW_COMPLIANCE ? (
        <ComplianceView key={VIEW_COMPLIANCE} {...chrome} />
      ) : activeTab === VIEW_RIDERS ? (
        <RidersView key={VIEW_RIDERS} {...chrome} />
      ) : (
        <CaptainsView key={VIEW_CAPTAINS} {...chrome} />
      )}
    </SingleColumnPage>
  )
}
