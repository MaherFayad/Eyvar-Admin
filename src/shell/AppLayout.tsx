/**
 * `AppLayout` (L-01) — design spec §1.1, spec §4.1. **The frame.**
 *
 * ```
 * ┌──────────────────────────────────────────────────────────────┐
 * │ shell banner strip — full viewport, 0 or 1, above everything │ 32
 * ├──────┬───────────────┬───────────────────────────────────────┤
 * │ rail │ sub-tab list  │ top bar  (content region only)        │ 52
 * │  80  │ 224, always   ├───────────────────────────────────────┤
 * │ nav  │ nav           │ <main> content region, WHITE, fluid   │
 * └──────┴───────────────┴───────────────────────────────────────┘
 *        ↑ 1px hairline  ↑ 1px hairline   — D7 §4.1, both seams
 * ```
 *
 * **Three independent scroll contexts** — the rail (never scrolls), the sub-tab
 * list, and the content region. Scrolling one leaves the other two untouched
 * (**AC-19**). That is why the outer frame is `h-screen overflow-hidden` and
 * each region owns its own overflow: a single page scroll would move all three.
 *
 * **Everything here is mounted ONCE for the session** (**AC-18**). The router
 * outlet is the only thing that changes on navigation, so a counter in each
 * region's mount effect reads 1 after twenty route changes.
 *
 * Rules applied
 *   §1.1        the top bar spans the CONTENT REGION ONLY, and both nav columns
 *               run full height. D-3 moved the wordmark into the rail, which is
 *               what made §2.1's full-width bar's left slot meaningful; with the
 *               wordmark gone the slot would be empty. Named as suspended in the
 *               new D-4 — do not "fix" it.
 *   §1.1/D7    **the tonal ladder does not invert and there is no grey canvas.**
 *               The reference's own stylesheet declares ONE tinted grey and
 *               spends it on the rail, the nav column and the tinted strips
 *               alike; the content region is pure white edge to edge. So the
 *               ladder is `--ev-bg-nav` = `--ev-bg2` **under** `--ev-bg`
 *               `#ffffff`: the nav is ONE STEP DARKER than the content,
 *               exactly as §2.1 says. What an earlier reading took for a grey
 *               canvas was the reference's 53px icon strip, which is that same
 *               tint. Values live in `globals.css` and nowhere else.
 *               **And both seams carry a 1px `--ev-hairline`** — D6's second
 *               bullet is void (D7 §4.1). At a 1.054:1 step the tone alone is
 *               not a boundary, and the reference draws the border at both
 *               sidebar edges in every frame.
 *               Legacy defect **D1** is closed differently now: it is
 *               NARROWED to "white on white *without a border*", which is what
 *               the legacy app shipped. Under D-11 a card is white on white and
 *               is carried by its 1px border and 8px radius (D7 §4.2).
 *   §3.2 (void) the sub-tab column is **ALWAYS RENDERED** (`DECISIONS.md`
 *               **D5**). There is no disclosure, no popover and no persisted
 *               collapse flag, so **AC-32** and **AC-33** are void with them.
 *               At the 1280px floor that is 80 + 224 = 304px of navigation and
 *               976px of content, which is exactly the width AC-31 asks the
 *               monitoring shell for at its own widest — see
 *               `02-shell-fixes.md` §2.
 *   §4.1/AC-51  the save bar **replaces the top bar in place**, same height,
 *               same slot, no layout shift. Both nav columns stay mounted and
 *               are **not** dimmed.
 *   §9.2 #22    a workspace the role cannot see is not rendered (**AC-57**);
 *               a deep link into it shows `route-forbidden` (**AC-56**).
 *   AC-62       `SkipToContent` is the FIRST focusable element in the document
 *               and targets the content region's `<main>` landmark.
 *   AC-13       the full-bleed editor is **not rendered through this component
 *               at all** — it is a sibling route, so the rail, the column and
 *               the top bar are absent from the DOM rather than hidden.
 *   AC-19       three scroll contexts, enforced structurally.
 *   §14         every utility is logical, so `dir="rtl"` puts the rail and the
 *               column on the inline-end physical side with no second rule
 *               (**AC-71**).
 */

import { useCallback } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { getRouteTable } from '@/data/clients'
import type { Notification, ShellLayerId } from '@/data/types'
import { ErrorState } from '@/components/ErrorState'
import { ModuleRail } from './ModuleRail'
import { PageNav } from './PageNav'
import { SaveBar } from './SaveBar'
import { ShellBanner } from './ShellBanner'
import { SkipToContent, CONTENT_LANDMARK_ID } from './SkipToContent'
import { TopBar } from './TopBar'
import { useShell } from './ShellContext'
import { visibleSubTabs, visibleWorkspaces } from './permissions'
import { useRouteState, withOverlay } from './routeState'
import { ProfileLayer } from './layers/ProfileLayer'
import { NotificationsLayer } from './layers/NotificationsLayer'
import { AccountLayer } from './layers/AccountLayer'

export function AppLayout() {
  const shell = useShell()
  const route = useRouteState()
  const navigate = useNavigate()
  const location = useLocation()
  const { t, dir, language } = shell.language

  const table = getRouteTable()
  /* AC-57 / AC-58 — a FILTER over the route table. Currently passes everything
     through, because Q4 is unanswered and every `permission` is `null`; the
     day it lands, the 34 values are a fixture edit and nothing here changes. */
  const rows = table.subTabs.filter((row) =>
    visibleSubTabs(shell.permissions, table.subTabs, row.workspaceId).includes(row),
  )
  const workspaces = visibleWorkspaces(shell.permissions, table.workspaces, table.subTabs)
  const workspaceRows = route.workspaceId
    ? visibleSubTabs(shell.permissions, table.subTabs, route.workspaceId)
    : []

  /* AC-22 — one layer at a time, enforced by the writer. Opening a second
     deletes the first's param; there is no path that can set two. */
  const setLayer = useCallback(
    (layer: ShellLayerId | null, value = '') => {
      navigate(
        { pathname: location.pathname, search: withOverlay(location.search, layer, value) },
        /* Opening PUSHES, so browser Back closes the layer and stays on the
           underlying route (**AC-21**). Closing REPLACES, so Escape does not
           leave a re-openable entry behind it. */
        { replace: layer === null },
      )
    },
    [navigate, location.pathname, location.search],
  )

  const closeLayer = useCallback(() => setLayer(null), [setLayer])

  const openNotificationTarget = useCallback(
    (notification: Notification) => {
      if (notification.entityId) {
        setLayer('entity', notification.entityId)
        return
      }
      if (notification.route) navigate(notification.route)
    },
    [navigate, setLayer],
  )

  return (
    /* AC-19 — the frame never scrolls; each region does. */
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground">
      {/* AC-62 — first focusable element in the document. */}
      <SkipToContent t={t} />

      {/* §4.2 — full viewport width, ABOVE everything including the rail. At
          most one, ever (**AC-40**); the merge is inside `ShellBanner`. */}
      <ShellBanner
        conditions={shell.conditions}
        t={t}
        onStopImpersonating={() => shell.setConditions({ impersonating: null })}
        onEndCall={() => shell.setConditions({ call: null })}
      />

      <div className="flex min-h-0 flex-1">
        <ModuleRail
          workspaces={workspaces}
          visibleRows={rows}
          navCounts={shell.navCounts}
          navCountsLoading={shell.navCountsLoading}
          activeWorkspaceId={route.workspaceId}
          landingRoute={shell.session?.landingRoute ?? '/operations/overview'}
          t={t}
        />

        {/* D5 — always rendered. The column is the level-2 navigation and it
            does not go away; there is no branch here any more. */}
        <PageNav
          workspace={route.workspace}
          rows={workspaceRows}
          navCounts={shell.navCounts}
          navCountsLoading={shell.navCountsLoading}
          activeSubTabId={route.subTabId}
          t={t}
        />

        {/* The content region: top bar (or save bar) + `<main>`. */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* AC-51 — ONE slot, ONE of two bars, identical height. Nothing is
              stacked and nothing is positioned over anything. */}
          {shell.saveBar && shell.saveBar.status !== 'clean' ? (
            <SaveBar model={shell.saveBar} t={t} />
          ) : (
            <TopBar
              route={route}
              shell={shell}
              t={t}
              dir={dir}
              language={language}
              onOpenEntity={(entityId) => setLayer('entity', entityId)}
              onOpenNotifications={() => setLayer('notifications', 'all')}
              onOpenAccount={() => setLayer('account', 'me')}
              onOpenNotification={openNotificationTarget}
              onSwitchUser={() => navigate('/admin/team')}
              onSignOut={() => navigate('/')}
              /* The rota is Admin › Team & Access's data. Until that sub-tab is
                 built the chip shows the gap, which is the state it exists for
                 — and a wrong name would be worse than an honest `unassigned`. */
              onCallName={null}
            />
          )}

          {/* AC-19 — the content region's own scroll context. AC-62's target. */}
          <main
            id={CONTENT_LANDMARK_ID}
            tabIndex={-1}
            /* No `outline-hidden` here. `<main>` is `tabIndex={-1}` purely as
               the skip link's target, and killing its outline would mean the
               one moment it receives focus — AC-62's *"activating it moves
               focus into the content region"* — has no visible confirmation.
               The base `:focus-visible` ring in `globals.css` is the right
               feedback for that jump, and §7.2 admits no `outline-none`
               without a replacement. */
            className="min-h-0 flex-1 overflow-y-auto"
          >
            {/* §9.1 — the shell's own ERROR state: identity or permissions
                could not be loaded. Page-scoped, SHELL INTACT, retry as an
                imperative. The operator can still see where they are. */}
            {shell.status === 'error' ? (
              <ErrorState
                scope="page"
                heading={t('state.shellError.title')}
                message={t('state.shellError.body')}
                action={{ label: t('state.shellError.action'), onClick: shell.retry }}
              />
            ) : (
              <Outlet />
            )}
          </main>
        </div>
      </div>

      {/* §6 — the three layers. One root, one open at a time (**AC-22**). */}
      {route.overlay === 'entity' && route.overlayValue && (
        <ProfileLayer
          entityId={route.overlayValue}
          open
          onClose={closeLayer}
          onOpenFullProfile={(path) => {
            closeLayer()
            navigate(path)
          }}
          t={t}
        />
      )}
      {route.overlay === 'notifications' && (
        <NotificationsLayer
          open
          onClose={closeLayer}
          t={t}
          language={language}
          onOpenNotification={openNotificationTarget}
          onChanged={shell.refreshNotifications}
        />
      )}
      {route.overlay === 'account' && (
        <AccountLayer
          open
          onClose={closeLayer}
          session={shell.session}
          status={shell.status}
          onRetry={shell.retry}
          t={t}
        />
      )}
    </div>
  )
}
