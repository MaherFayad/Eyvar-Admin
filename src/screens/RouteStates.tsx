/**
 * `route-not-found` and `route-forbidden` — design spec §11.6 states 1 and 2,
 * as drawn in `02-visual-refinement.md` §4.7. **AC-12** and **AC-56**.
 *
 * Both are rendered **inside the content region with the shell intact**. That
 * is the whole point of them:
 *
 *   **AC-12** — loading `/nonsense/route` renders the not-found state inside
 *   the content region with the rail, sub-tab list and top bar all present and
 *   interactive. **The URL is not rewritten.** So there is no `<Navigate>`
 *   anywhere in this file: a redirect would rewrite the URL and destroy the
 *   evidence the operator needs to tell you what they clicked.
 *
 *   **AC-56** — loading a route the role cannot see renders the forbidden state
 *   **naming the permission required**. Not a redirect and **not a toast**
 *   (§11.2): a redirect teaches the operator that the URL they were given is
 *   wrong, when the truth is that their role is.
 *
 * `resolveRoute` keeps the LAST VALID WORKSPACE selected for a path whose first
 * segment names one, so `/operations/nonsense` still highlights Operations
 * while showing this. That is §9.2's *"shell intact, last valid workspace still
 * selected"*, and it happens in `routeState.ts` rather than here.
 *
 * **§4.7 — the page header.** Both screens used to render a bare `ErrorState`
 * with no `<h1>` at all, so the page had no accessible name and the card landed
 * at a different y from every other state.
 *
 *   `ForbiddenScreen` **renders the route's title as its `<h1>`.** The operator
 *   typed or clicked something and is owed the name of what they asked for.
 *   That is not a disclosure risk: the route table's titles are not secret,
 *   only its data is.
 *   `NotFoundScreen` renders **an empty header block and no `<h1>`** — there is
 *   no route, so there is no name — but the block is still there, so the card
 *   lands at the same y as every other state.
 */

import { useNavigate } from 'react-router-dom'
import { ErrorState } from '@/components/ErrorState'
import { PageHeader } from '@/components/PageHeader'
import { SingleColumnPage } from '@/components/PageShell'
import { useShell } from '@/shell/ShellContext'
import { permissionName } from '@/shell/permissions'
import { useRouteState } from '@/shell/routeState'

/**
 * §4.7 — the empty header block. Not a `PageHeader` with an empty title: a
 * `<h1>` containing nothing is worse than no `<h1>`, because a screen reader
 * announces an unnamed heading. This reserves the same vertical space and
 * nothing else, so the card beneath lands where every other state's does.
 *
 * The height is the header's own: a 24px `text-lg` line box plus `pb-4`.
 */
function EmptyHeaderBlock() {
  return <div aria-hidden="true" className="h-6 pb-4" />
}

/** §11.6 state 1. */
export function NotFoundScreen() {
  const shell = useShell()
  const route = useRouteState()
  const navigate = useNavigate()
  const { t } = shell.language

  /* `Go to overview` goes to the workspace the operator is still in, when the
     path named one, and to their landing route otherwise. Never a redirect —
     this is a control the operator chooses, which is a different thing. */
  const target = route.workspace
    ? `${route.workspace.routePrefix}/overview`
    : (shell.session?.landingRoute ?? '/operations/overview')

  return (
    <SingleColumnPage header={<EmptyHeaderBlock />}>
      <ErrorState
        scope="page"
        heading={t('state.notFound.title')}
        message={t('state.notFound.body')}
        action={{ label: t('state.notFound.action'), onClick: () => navigate(target) }}
      />
    </SingleColumnPage>
  )
}

/**
 * §11.6 state 2. **Names the permission and who can grant it.**
 *
 * `permission` is the key from the route table's `permission.key`. Q4 is
 * unanswered and every row ships `null`, so this screen is unreachable through
 * the filter *today* — but it is **wired**, in `routes.tsx`, so the day the 34
 * values land no shell code changes. The QA verdict recorded its zero call
 * sites as the AC-56 failure; that is what the wiring fixes.
 */
export function ForbiddenScreen({
  permission,
  /** §4.7 — the route's own title, so the page has a name. */
  title,
}: {
  permission: string
  title?: string
}) {
  const shell = useShell()
  const navigate = useNavigate()
  const { t, dir } = shell.language

  return (
    <SingleColumnPage
      header={
        title ? (
          <PageHeader title={title} t={t} dir={dir} />
        ) : (
          <EmptyHeaderBlock />
        )
      }
    >
      <ErrorState
        scope="page"
        heading={t('state.forbidden.title')}
        /* AC-75 — one key, one named placeholder. Never
           `'This page needs the "' + permission + '" permission.'`

           **The NAME, not the key.** This interpolated `permission` raw, so an
           operator read *This page needs the “live_ops” permission.* A refusal
           that quotes an identifier tells them nothing they can act on and
           cannot be translated. `perm.<key>.name` is the short noun phrase. */
        message={t('state.forbidden.body', { permission: permissionName(t, permission) })}
        action={{
          label: t('state.forbidden.action'),
          onClick: () => navigate(shell.session?.landingRoute ?? '/operations/overview'),
        }}
      />
    </SingleColumnPage>
  )
}
