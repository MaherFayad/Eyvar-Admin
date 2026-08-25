/**
 * The generic sub-tab screen — **the placeholder every Phase 1 sub-tab
 * replaces**, and the proof that all four states are wired before any of them
 * is built.
 *
 * `PHASE-PLAN.md`: the unit of work in Phase 1 is a sub-tab, and each owns
 * exactly one directory, `src/screens/<workspace>/<sub-tab>/`. Until a sub-tab
 * is built, its route resolves here, so:
 *
 *   - every one of the 34 routes is reachable and shows the right chrome,
 *     which is what makes AC-03, AC-05, AC-09 and AC-10 testable today;
 *   - the page shape comes from `row.shape`, so AC-14's monitoring shell and
 *     §7.2's detail shape are exercised rather than assumed;
 *   - **all four states exist from the start** (`states.md`): the screen reads
 *     nav counts through `useAsync`, so `loading`, `error`, `empty` and
 *     `content` are all reachable, and **AC-36**'s induced failure lands on a
 *     real error state rather than a blank div.
 *
 * A Phase 1 engineer replaces the `children` of the page shell. The header, the
 * shape, the banner slot and the four states are already correct.
 */

import { useNavigate } from 'react-router-dom'
import { useAsync } from '@/hooks'
import { getNavCounts } from '@/data/clients'
import type { NavCounts, SubTabRoute } from '@/data/types'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { EmptyState } from '@/components/EmptyState'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/PageHeader'
import { DetailPage, MonitorShell, SingleColumnPage } from '@/components/PageShell'
import { useShell } from '@/shell/ShellContext'
import { useRouteState } from '@/shell/routeState'

export function SubTabScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  const route = useRouteState()
  const navigate = useNavigate()
  const { t, dir } = shell.language

  /* A real read, so the four states are real. AC-36 induces its failure here. */
  const data = useAsync<NavCounts>((signal) => getNavCounts(signal), { deps: [row.subTabId] })

  const title = t(row.titleKey)
  const header = (
    <PageHeader
      title={title}
      /* V4 — **`row.subtitleKey` is NOT passed any more.** §8's second row is a
         METADATA line (`4 218 captains · 611 riders`), derived from the record
         set; the route table supplies a static DESCRIPTION, and the build was
         faithfully rendering the description. Those are different things and
         only one of them earns 20px on every page, forever, on all 34 routes —
         especially now that the top bar's route trail is gone and the page
         header is the only place either string appears. A sub-tab that
         genuinely needs explaining gets that in its first-run empty state,
         where the operator is actually stuck.
         `routeTable.subtitleKey` and its 34 strings are now unrendered.
         Deleting a route-table field is product-owner scope, so they stay —
         raised in `02-shell-fixes.md`. */
      /* §8 slot 1 — absent on index routes; present on a detail. Derived from
         the ROUTE's shape, never from a stack depth. */
      onBack={route.showsBackArrow ? () => navigate(-1) : undefined}
      t={t}
      dir={dir}
    />
  )

  const body =
    data.status === 'loading' ? (
      <LoadingSkeleton pattern={row.patterns[0] === 'SH' ? 'P1' : (row.patterns[0] ?? 'P1')} />
    ) : data.status === 'error' ? (
      /* §9.2 #3 / **AC-24** — the sub-tab renders its OWN error state and the
         rail, sub-tab list and top bar keep working. The operator can navigate
         away without a reload. */
      <ErrorState
        scope="page"
        heading={t('state.pageError.title', { resource: title })}
        message={t('state.pageError.body')}
        action={{ label: t('state.pageError.action'), onClick: data.refetch }}
      />
    ) : data.status === 'empty' ? (
      <EmptyState kind="no-match" message={t('table.noMatch', { resource: title })} />
    ) : (
      /* THE CONTENT BRANCH — reached when the fetch SUCCEEDS.
         It used to render `state.cardError.message`, so a healthy load told the
         operator "Couldn't load Performance." on a page that had loaded fine.
         That is the bar the business owner was looking at, and it was never the
         error state: `ErrorState` has a heading, a body and a retry and is
         simply not reached here (V8). */
      <Card>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('state.placeholder.message', { resource: title })}
          </p>
        </CardContent>
      </Card>
    )

  /* §3.10 / §7 — the shape comes from the ROUTE TABLE. `bleed` never reaches
     here: it is a sibling route outside `AppLayout` (**AC-13**). */
  if (row.shape === 'monitor') {
    /* AC-14 — the shell stays; only the content region goes full width with no
       cap, and the standard page header remains. */
    return <MonitorShell header={header} canvas={body} aside={null} />
  }

  if (row.shape === 'detail') {
    return <DetailPage header={header} main={body} rail={[]} />
  }

  /* §7.1 (amended, D7) — ONE width. The `full` / `capped` split is what made
     the page header jump between routes; `SingleColumnPage` caps everything now
     and there is nothing to decide here. */
  return (
    <SingleColumnPage header={header}>
      {body}
    </SingleColumnPage>
  )
}
