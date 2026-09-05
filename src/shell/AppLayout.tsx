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

import { useCallback, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  getOnCallRota,
  getRouteTable,
  getTeamUser,
  markOnboardingAutoOpened,
  markNotificationRead,
  switchMockUser,
  updateUiState,
} from '@/data/clients'
import { shouldAutoOpen } from '@/data/clients'
import { track } from '@/lib/analytics'
import { PROFILE_ENTITY_TYPES } from '@/data/types'
import type { Notification, ProfileEntityType, ShellLayerId } from '@/data/types'
import type { Language } from '@/lib'
import { ErrorState } from '@/components/ErrorState'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ModuleRail } from './ModuleRail'
import { PageNav } from './PageNav'
import { useTheme } from '@/hooks'
import { SaveBar } from './SaveBar'
import { ShellBanner } from './ShellBanner'
import { SkipToContent, CONTENT_LANDMARK_ID } from './SkipToContent'
import { TopBar } from './TopBar'
import { MobileNavPanel, MobileNavRoot, MobileNavTrigger } from './MobileNav'
import { useShell } from './ShellContext'
import { visibleSubTabs, visibleWorkspaces } from './permissions'
import { useRouteState, withOverlay } from './routeState'
import { ProfileLayer } from './layers/ProfileLayer'
import {
  COMPLIANCE_VIEW_PERMISSION,
  PAYOUTS_VIEW_PERMISSION,
} from '@/components/profile/driver'
import { NotificationsLayer } from './layers/NotificationsLayer'
import { AccountLayer } from './layers/AccountLayer'
import { OnboardingLayer } from '@/screens/onboarding'
import { Banner } from '@/components/Banner'
import { ReauthModal } from '@/components/auth/ReauthModal'
import { SignOutDirtyDialog } from './SignOutDirtyDialog'
import { FROZEN_REASON_ID } from '@/components/auth/AuthCredentialForm'
import { useAsync, useCompactShell, useDrawerDisclosure, useFocusCapture, useOnline, usePresence } from '@/hooks'
import { AvailabilityControl } from './AvailabilityControl'
import { useDocumentTitle } from './useDocumentTitle'
import type { SessionExpiryReason } from './session'

export function AppLayout() {
  const shell = useShell()
  const route = useRouteState()
  const navigate = useNavigate()
  const location = useLocation()
  const { t, language } = shell.language

  /* The tab, the history entry and the screen reader's navigation announcement
     all read this. Every route said `Eyvar Admin` before. */
  useDocumentTitle(route, t)

  /**
   * **The compact shell.** Below `--ev-bp-compact` (768px) the three-column
   * frame does not narrow — it goes away, and the two nav columns move into a
   * focus-trapped drawer behind the control in the bar. See `MobileNav.tsx`.
   *
   * This is React state and not only a media query because the DIFFERENCE is
   * structural rather than visual: above the breakpoint the rail and column are
   * siblings of the content, below it they are children of a dialog. A
   * `compact:` class could not move them.
   */
  const compact = useCompactShell()
  /* Closed by default, closes on route change, closes when compact mode ends.
     Escape and the scrim are Radix's, not ours — see the hook. */
  const drawer = useDrawerDisclosure(location.pathname + location.search, compact)
  /* Built once per render and handed to whichever bar is in the slot. `null`
     above the breakpoint, so the desktop bar is byte-identical to before. */
  const menu = compact ? <MobileNavTrigger t={t} /> : null

  /* The colour theme. Held here rather than in `ShellContext` because
     nothing but this menu reads it — the palette itself is a block of
     `--ev-*` overrides and no component branches on the theme. */
  const theme = useTheme()

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
    (layer: ShellLayerId | null, value = '', opts: { replace?: boolean } = {}) => {
      navigate(
        { pathname: location.pathname, search: withOverlay(location.search, layer, value) },
        /* Opening PUSHES, so browser Back closes the layer and stays on the
           underlying route (**AC-21**). Closing REPLACES, so Escape does not
           leave a re-openable entry behind it. A caller may replace to update
           the value of an already-open layer without growing history. */
        { replace: layer === null || opts.replace === true },
      )
    },
    [navigate, location.pathname, location.search],
  )

  const closeLayer = useCallback(() => setLayer(null), [setLayer])

  /**
   * **AC-568** — explicit `Sign out` while dirty raises the
   * `navigate-away-dirty` modal naming what will be lost, and **cancelling
   * leaves the operator signed in and the form dirty**.
   *
   * Distinct from §8.3's confirmation inside the re-auth modal: there the
   * session has **expired** and the console is frozen; here it is alive and
   * nothing is frozen. *Only the operator discards their own work* — which is
   * the whole rule, and it is why signing out cannot be allowed to take a dirty
   * form with it silently.
   */
  const [confirmingSignOut, setConfirmingSignOut] = useState(false)

  const signOut = useCallback(() => {
    setConfirmingSignOut(false)
    shell.setSaveBar(null)
    shell.session_lifecycle.signOut()
    navigate('/signin', { replace: true })
  }, [navigate, shell])

  /* ── the session lifecycle's two routed halves (design/08 §8.1) ───────── */

  const lifecycle = shell.session_lifecycle
  const online = useOnline()
  const { registerLayerCloser, registerCleanExpiry } = shell

  /* §8.1 rule 5 — **entering `session-expired` closes every open shell layer
     first**, because tier 3 may not composite over tier 2 (R4-3 §3.2): §5.0
     forbids a modal nested in a drawer. *Form state is preserved; overlay state
     is not*, and those are different things. Closing a layer is a navigation,
     which the provider cannot do, so the provider is handed the closer. */
  useEffect(() => {
    registerLayerCloser(() => setLayer(null))
  }, [registerLayerCloser, setLayer])

  /* §8.1 branch 1 — a **clean** route redirects to `/signin` with the reason
     named. There is nothing to lose, and a clean redirect is a clearer signal
     than a modal over a page the operator was not editing. */
  useEffect(() => {
    registerCleanExpiry((reason: SessionExpiryReason) => {
      /* **The window that actually expired, not the module constant.** The
         lifecycle hook already resolved and clamped it from
         `SecurityPolicy.idleTimeoutMinutes`; quoting the default here would
         tell an admin who set 60 minutes that they had been idle for 30. */
      navigate('/signin', {
        replace: true,
        state: { condition: endedCondition(reason, lifecycle.idleTimeoutMinutes) },
      })
    })
  }, [registerCleanExpiry, navigate, lifecycle.idleTimeoutMinutes])

  /**
   * **AC-565** — the element that had focus at freeze time is recorded and
   * restored on success, with the scroll position untouched.
   *
   * `useFocusCapture`, not `useFocusEntry`, and the difference is the **phase**:
   * this captures during **render**, before React commits the freeze and before
   * the layer-closing effect above runs — each closing layer's own
   * `useFocusEntry` restores focus to *its* opener and would otherwise be the
   * last writer, so an effect-phase capture records the notifications button
   * instead of the field the operator was in.
   */
  const focus = useFocusCapture({ captured: lifecycle.frozenReason !== null })

  /**
   * AC-593/AC-594 — the layer opens itself exactly once: on the landing route,
   * after the content region's first load has finished (no `aria-busy` left
   * inside `<main>`), never for a dismissed account and never a second time.
   * `shouldAutoOpen` is the one answer to "has this operator seen it";
   * `markAutoOpened` is stamped before the layer opens so a reload cannot
   * repeat it. A layer already open on arrival (AC-593) counts as seen.
   */
  /* Settled per account: a mock user switch is a new first session. */
  const autoOpenSettledFor = useRef<string | null>(null)
  useEffect(() => {
    if (shell.onboardingStatus !== 'content' || shell.onboarding === null) return
    if (autoOpenSettledFor.current === shell.onboarding.userId) return
    const settle = () => {
      autoOpenSettledFor.current = shell.onboarding?.userId ?? null
    }
    if (!shouldAutoOpen(shell.onboarding.state)) {
      settle()
      return
    }
    if (route.overlay === 'onboarding') {
      settle()
      void markOnboardingAutoOpened()
      return
    }
    const landing = shell.session?.landingRoute
    if (!landing || location.pathname !== landing || route.overlay !== null) return
    const main = document.getElementById(CONTENT_LANDMARK_ID)
    if (main === null) return
    const busy = () => main.querySelector('[aria-busy="true"]') !== null
    const open = () => {
      settle()
      void markOnboardingAutoOpened()
      track('onboarding.opened', { source: 'auto' })
      setLayer('onboarding', '1')
    }
    if (!busy()) {
      open()
      return
    }
    const observer = new MutationObserver(() => {
      if (busy()) return
      observer.disconnect()
      open()
    })
    observer.observe(main, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-busy'],
    })
    return () => observer.disconnect()
  }, [
    shell.onboardingStatus,
    shell.onboarding,
    shell.session?.landingRoute,
    location.pathname,
    route.overlay,
    setLayer,
  ])

  /**
   * §11.6 row 23 `language-switching` — **AC-70's only production call site.**
   *
   * `setLanguage` writes `dir` and `lang` on the DOCUMENT ELEMENT (that is
   * inside `useLanguage`, not repeated here) and updates the state
   * `DirectionBridge` feeds to Radix, so the geometry and Radix's own side /
   * alignment / arrow-key logic flip from one source in one render.
   *
   * Nothing navigates and nothing remounts: the provider sits above the router
   * outlet, so the operator keeps the same route, the same view and the same
   * scroll position, which is exactly what row 23 asks for.
   *
   * R9/R10 — a transient confirmation of something that already happened, so a
   * TOAST and not a banner, one line, no action. The name is interpolated from
   * the same key the menu item renders, so the two can never disagree.
   *
   * **The toast is written in the language just chosen**, through
   * `translatorFor(next)`. `shell.language.t` is still the PRE-switch
   * translator inside this closure — state has not re-rendered — so using it
   * put an English sentence on a page that had already become Arabic, which is
   * the one piece of Latin left on the screen at the moment an operator is
   * checking whether the switch worked.
   *
   * **The choice now survives reload, and Q1 is closed.** It did not, and the
   * reason was not the one recorded here: `defaultUiStore` already gives the
   * language key a `localStorage`-backed cached store, so the write was
   * happening. What was missing is the other half of a write-through cache —
   * nobody told the SERVER. On the next load the shell fetched the preference
   * bag, the seeded `en` came back, and `writeUiStateToCache` overwrote the
   * cached `ar` with it. The cache was working exactly as designed; *"the
   * server always wins"* is the rule, and the server had never been told.
   *
   * So the mutation goes out alongside the local write, in the shape
   * `commands/recents.ts` already uses for the same reason: fire-and-forget,
   * failure swallowed. A language that reverts on refresh is not a preference,
   * and an operator reading Arabic should not have to reselect it every visit.
   */
  const setLanguage = useCallback(
    (next: Language) => {
      shell.language.setLanguage(next)
      void updateUiState({ language: next }).catch(() => {})
      /* G9 — `info`. Switching language changed a preference, not an
         object, so it is not a `success` in R9's sense; and a bare `toast()`
         is no longer a kind this product has. */
      const after = shell.language.translatorFor(next)
      toast.info(
        after('state.languageSwitched.toast', { language: after(`shell.language.${next}`) }),
      )
    },
    [shell.language],
  )

  /**
   * **Opening a notification marks it read**, which it did not.
   *
   * `markNotificationRead` (`clients/notifications.ts`) had **zero callers**,
   * so the bell's badge never decremented: an operator could work through every
   * notification and the count would still read 3. §6.3's third listed defect is
   * that legacy loses every read flag on reload; the rebuild had gone one worse
   * and never set one.
   *
   * Both entry points route through here — the bell popover
   * (`NotificationBell`) and the layer (`NotificationsLayer`) — so one call
   * covers both, which is why it is here and not duplicated in each.
   *
   * **Navigation does not wait for the write.** The operator asked to go
   * somewhere; a bookkeeping flag must not put a request between them and it.
   * The summary is refreshed either way, so the badge shows whatever the server
   * actually holds rather than an optimistic decrement that could be wrong —
   * and a failed write leaves a count that is high, which is the safe direction
   * to be wrong in. No toast: R9 spends a toast on something the operator did,
   * and this is bookkeeping they did not ask for.
   */
  /**
   * **Who is on call, from the rota rather than from `null`.**
   *
   * The chip shipped `onCallName={null}` with a comment saying the rota was
   * Admin › Team & Access's data and did not exist yet. It does now
   * (`getOnCallRota`), and the asymmetry while it did not was the worse of the
   * two failure modes: an admin could set the rota, get a confirmation that the
   * setting took, and watch the top bar go on reading `On call: unassigned`
   * forever.
   *
   * Two reads, one dependent on the other, because the rota stores an **id**
   * and the chip needs a **name** — and `getTeamUser` is the operation that
   * turns one into the other. `null` all the way through is still a real
   * answer: `primaryUserId: null` is the gap the chip exists to show, and
   * `TopBar` already renders `On call: unassigned` for it.
   *
   * Read once, at the shell, like the nav counts. It does not revalidate when
   * an admin edits the rota on another route — that is P8-T2's job (revalidate
   * on route change plus a slow poll) and it applies to every shell read at
   * once, not to this one specially. Noted in the handoff rather than solved
   * here with a poll nobody asked for.
   */
  /* §6.3: availability is a shell control; the console reads the same hook. */
  const presence = usePresence({
    currentUserId: shell.session?.userId ?? '',
    role: shell.session?.role ?? null,
    revision: 0,
    enabled: shell.session !== null,
  })

  const onCall = useAsync<string | null>(async (signal) => {
    const rota = await getOnCallRota(signal)
    if (rota.primaryUserId === null) return null
    return (await getTeamUser(rota.primaryUserId, signal)).name
    /* **Deliberately NOT cached (P3-13).** Two reasons, either sufficient: the
       shell mounts once so nothing would read the entry, and this fetcher calls
       *two* operations (`team.rota` then `team.get`) so neither id names what
       is stored. */
  }, { deps: [] })

  /**
   * **Marking read is now its own operation, reachable without navigating.**
   *
   * It used to live inside `openNotificationTarget`, which is only ever called
   * from a row that HAS a destination — so a notification with `route: null`
   * **and** `entityId: null` could never be marked read individually at all.
   * `alert` is the most-produced runtime type and the one most often without a
   * destination (`types/notifications.ts`), so that was not a corner case.
   *
   * Returns the promise so the surface that asked can repaint its own list when
   * the write lands; `openNotificationTarget` deliberately does not await it —
   * the operator asked to go somewhere and a bookkeeping flag must not sit
   * between them and it. A failed write leaves the count HIGH, which is the safe
   * direction to be wrong in, and `refreshNotifications` means the badge shows
   * what the server holds rather than an optimistic decrement.
   *
   * Read state itself is still **in-memory in the mock** and resets on reload —
   * that is Q1, and it is not answered here.
   */
  const markNotificationAsRead = useCallback(
    (notification: Notification): Promise<void> => {
      if (notification.read) return Promise.resolve()
      return markNotificationRead(notification.id)
        .then(() => undefined)
        .catch(() => undefined)
        .finally(() => shell.refreshNotifications())
    },
    [shell],
  )

  /**
   * **`entityId` only wins when it names a PROFILE entity.**
   *
   * `?entity=` is resolved by `clients/profile.ts`, which knows the eleven
   * `PROFILE_ENTITY_TYPES` and nothing else. Preferring `entityId`
   * unconditionally sent every other kind of id into that resolver, which
   * returns `null`, which renders `ProfileLayer`'s not-found empty naming an id
   * the operator cannot do anything about. Four seeded rows did this — `ALR-1`
   * (`alert-rule`), `PO-0007` (`payout`), `SNAP-0030` (untyped) and `APP-2202`
   * (`application`) — including the ONE end-to-end alert path, whose correct
   * destination (`route`) was sitting on the same row unused.
   *
   * The ids stay on the fixtures: `entityId` is the reconciliation key
   * `AlertFiring.notificationId` depends on (`types/report.ts`). It is the
   * routing preference that was wrong, not the data.
   */
  const openNotificationTarget = useCallback(
    (notification: Notification) => {
      void markNotificationAsRead(notification)
      const opensAProfile =
        notification.entityId !== null &&
        notification.entityType !== null &&
        PROFILE_ENTITY_TYPES.includes(notification.entityType as ProfileEntityType)
      if (opensAProfile && notification.entityId) {
        setLayer('entity', notification.entityId)
        return
      }
      if (notification.route) {
        navigate(notification.route)
        return
      }
      /* No route and an id of some other kind: the overlay is the only
         affordance the row was drawn with, so it is still tried rather than
         leaving a `<button>` that does nothing (§11.2). */
      if (notification.entityId) setLayer('entity', notification.entityId)
    },
    [markNotificationAsRead, navigate, setLayer],
  )

  /**
   * **`Switch user` switches user.** It called `navigate('/admin/team')` — a
   * menu item that took the operator somewhere unrelated and left them to work
   * out that it had not done what its label said.
   *
   * `switchMockUser` returns the new session, so the landing route comes from
   * the server's own answer rather than from a role→route map recomputed here
   * (§3.3, §8.2). Navigating matters: the role decides which workspaces are
   * visible, and staying put would leave the operator on a sub-tab their new
   * role may not hold — `route-forbidden` is the correct render for that
   * (**AC-56**), but it is a poor place to arrive.
   *
   * `shell.retry` re-reads the session, which is what repaints the rail, the
   * sub-tab column, the permission summary and the `mine` chip.
   *
   * **Mock-only**, by the client's own contract: in `http` mode this is
   * impersonation and belongs to an audited endpoint. `AccountMenu` disables
   * the control there with the reason stated (§11.2), so this handler is not
   * reachable — the `catch` is for a switch that legitimately fails, and it
   * says so rather than leaving the menu looking as if it worked.
   */
  const switchUser = useCallback(
    (userId: string) => {
      void switchMockUser(userId)
        .then((next) => {
          shell.retry()
          navigate(next.landingRoute)
          /* R9/R10 — a transient confirmation of something that already
             happened: one line, names who, no action. Same register as the
             language toast (§11.6 row 23). */
          toast.success(t('state.userSwitched.toast', { name: next.name, role: next.role }))
        })
        .catch(() => {
          toast.error(t('state.userSwitched.failed'))
        })
    },
    [navigate, shell, t],
  )

  return (
    /* The dialog root wraps the WHOLE frame because the drawer's trigger is
       inside the bar and Radix restores focus to the trigger on close. See
       `MobileNavRoot`. It renders no DOM and, above the breakpoint, its `open`
       can never become true. */
    <MobileNavRoot open={drawer.open} onOpenChange={drawer.setOpen}>
    {/* AC-19 — the frame never scrolls; each region does. */}
    <div
      /* The device insets, on the OUTERMOST element, once. `viewport-fit=cover`
         puts the document under the notch and the home indicator, and this is
         the only element every region is inside — padding it means no region
         has to know. `env()` resolves to 0 where it does not apply, so this is
         measured to change nothing at 1440x900. Box-sizing is border-box from
         the preflight, so `h-screen` still means the viewport height and the
         padding comes out of the content box rather than adding to it. */
      /* **The hook `globals.css` clips the document by** — see the
         `[data-app-frame]` rule there. It is an attribute rather than a class
         because it is a fact about the page ("the app frame is mounted"), not a
         style, and because a class here could be merged away by `cn` at a call
         site that never meant to. */
      data-app-frame=""
      className="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground pt-safe-top pb-safe-bottom ps-safe-start pe-safe-end"
    >
      {/* AC-62 — first focusable element in the document. */}
      <SkipToContent t={t} />

      {/* §4.2 — full viewport width, ABOVE everything including the rail. At
          most one, ever (**AC-40**); the merge is inside `ShellBanner`. */}
      {/* §8.6, deviation **A-1** — **the idle warning takes the shell slot
          outright** instead of merging into a count, and restores what it
          displaced when it resolves. Every other shell condition is indefinite;
          this one has a **deadline** and a two-minute life, and folding a
          deadline into `2 conditions need your attention.` destroys the only
          information it carries — an operator who reads that and expands it has
          spent fifteen of their hundred and twenty seconds.

          **R10's invariant is untouched**: one banner renders, never two. What
          is suspended is §5.2's *merge* clause, for one condition, for two
          minutes, with automatic restoration. */}
      {lifecycle.idleWarningMinutes !== null ? (
        <Banner
          variant="shell"
          /* Ticks **per minute, not per second** — three renders, three polite
             announcements. A per-second live region is unusable with a screen
             reader, and a per-second visual tick on a standing banner is an
             ambient loop R18 does not licence. It is **undismissable**: it
             names a standing condition (00-shell §11.4's dismiss rule). */
          banner={{
            id: 'session-idle-warning',
            tone: 'warning',
            title:
              lifecycle.idleWarningMinutes === 0
                ? t('session.idleWarningSoon')
                : t.plural('session.idleWarning', { minutes: lifecycle.idleWarningMinutes }),
            /* **AC-559** — the banner appearing does not extend the session.
               Only this does, and activating it removes the banner. */
            actions: [{ label: t('session.staySignedIn'), onClick: lifecycle.staySignedIn }],
          }}
          /* **AC-558** — a banner, not a modal, no scrim, and it does not block
             the page. `status`, not `alert`: it is a deadline, not a rejection,
             and it announces politely three times. */
          role="status"
        />
      ) : (
        <ShellBanner
          conditions={shell.conditions}
          t={t}
          onStopImpersonating={() => shell.setConditions({ impersonating: null })}
          onEndCall={() => shell.setConditions({ call: null })}
        />
      )}

      <div className="flex min-h-0 flex-1">
        {/* Below the breakpoint these two are rendered by `MobileNavPanel`
            instead, with the same props. They are not hidden here and not
            duplicated — there is exactly one `ModuleRail` and one `PageNav` in
            the document on every viewport, so the two navigation landmarks
            stay unique and a screen reader is never offered a second copy. */}
        {!compact && (
        <ModuleRail
          workspaces={workspaces}
          visibleRows={rows}
          navCounts={shell.navCounts}
          navCountsLoading={shell.navCountsLoading}
          activeWorkspaceId={route.workspaceId}
          landingRoute={shell.session?.landingRoute ?? '/operations/overview'}
          t={t}
        />
        )}

        {/* D5 — rendered ABOVE the breakpoint, *when the route has a level-2
            navigation to show*. What changes below 768 is where the column
            lives, not whether it exists — that half of D5 is unchanged.

            **The `workspaceRows.length` guard is the fix for an empty column.**
            `route.workspaceId` is `null` on `/entity/:entityId`, which belongs
            to no workspace by design (`routeState.ts` — "the profile's full-page
            escape belongs to no workspace"). `workspaceRows` was therefore `[]`
            and `PageNav` still rendered its full `w-subnav` tinted column with a
            blank heading band and no rows: a 224px dead grey strip down the
            whole page, on the one route that most needs the width. */}
        {!compact && workspaceRows.length > 0 && (
        <PageNav
          workspace={route.workspace}
          rows={workspaceRows}
          navCounts={shell.navCounts}
          navCountsLoading={shell.navCountsLoading}
          activeSubTabId={route.subTabId}
          t={t}
        />
        )}

        {/* The content region: top bar (or save bar) + `<main>`. */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* AC-51 — ONE slot, ONE of two bars, identical height. Nothing is
              stacked and nothing is positioned over anything. */}
          {shell.saveBar && shell.saveBar.status !== 'clean' ? (
            <SaveBar
              model={shell.saveBar}
              t={t}
              /* Two causes, one treatment (§8.1, §8.5). While the console is
                 frozen the reason is the visually-hidden `session-expired`
                 sentence every other inert control also points at; while a
                 write permission has been revoked it is the page-level banner
                 below. `Discard` stays enabled through both. */
              blockedReasonId={
                lifecycle.frozenReason !== null
                  ? FROZEN_REASON_ID
                  : shell.writeRevokedPermission !== null
                    ? WRITE_REVOKED_BANNER_ID
                    : null
              }
              /* AC-51's *"both nav columns stay mounted"* has to keep meaning
                 something below the breakpoint. See `SaveBarProps.menu`. */
              menu={menu}
            />
          ) : (
            <TopBar
              shell={shell}
              t={t}
              language={language}
              onOpenEntity={(entityId) => setLayer('entity', entityId)}
              onOpenNotifications={() => setLayer('notifications', 'all')}
              onOpenAccount={() => setLayer('account', 'me')}
              /* §10.4 — the permanent account-menu entry, and **AC-613**'s
                 keyboard path into the layer. `?onboarding=1`: the value is the
                 literal `1`, not an id. */
              onOpenOnboarding={() => {
                track('onboarding.opened', { source: 'menu' })
                setLayer('onboarding', '1')
              }}
              onOpenNotification={openNotificationTarget}
              onSwitchUser={switchUser}
              onSignOut={() => {
                /* Nothing dirty, nothing to confirm — a dialog that asks about
                   work that does not exist is a dialog an operator learns to
                   dismiss without reading. */
                if (shell.saveBar && shell.saveBar.status !== 'clean') setConfirmingSignOut(true)
                else signOut()
              }}
              onSetLanguage={setLanguage}
              theme={theme.choice}
              onSetTheme={theme.setTheme}
              /* `null` covers three situations that all render as the honest
                 `On call: unassigned` — nobody is rostered, the read has not
                 landed, and the read failed. A wrong name would be worse than
                 any of them, and a skeleton on a 28px chip would be noise. */
              onCallName={onCall.data ?? null}
              availability={<AvailabilityControl presence={presence} t={t} language={language} />}
              menu={menu}
              compact={compact}
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
              <>
                {/* §8.5 `write-permission-revoked-while-dirty` — **one
                    page-level `critical` banner** (R5a use #2), the first
                    element of the content block, spanning main + rail. `Save`
                    is disabled with this as its reason, `Discard` stays
                    enabled, and the form's content stays on screen and
                    **selectable** — `readOnly`, never `disabled` (**AC-586**).
                    Never a silent drop, never a toast, never a redirect. */}
                {shell.writeRevokedPermission !== null && (
                  <div id={WRITE_REVOKED_BANNER_ID} className="p-page-pad pb-0">
                    <Banner
                      banner={{
                        id: 'write-revoked',
                        tone: 'critical',
                        title: t('session.writeRevoked.title'),
                        body: t('session.writeRevoked.body', {
                          permission: shell.writeRevokedPermission,
                        }),
                      }}
                    />
                  </div>
                )}
                {/* **P1-8 — the route-level boundary.** It is INSIDE `<main>`
                    and outside nothing else, which is the whole design: a
                    throw in a screen replaces the content region and leaves
                    the rail, the sub-tab column and the top bar mounted and
                    interactive, exactly as `route-not-found` and
                    `route-forbidden` already do (**AC-24**). A boundary in
                    `App.tsx` or around `<Routes>` would take all three down
                    with the screen and there would be nothing left to
                    navigate with.

                    `resetKeys` carries the location, so a crashed screen does
                    not follow the operator to the next route — no reload, no
                    press. `name` is the route's own title from the route
                    table, so the state names WHAT failed rather than saying
                    "this page". */}
                <ErrorBoundary
                  scope="page"
                  t={t}
                  name={route.subTab ? t(route.subTab.titleKey) : undefined}
                  resetKeys={[location.pathname, location.search]}
                  /* The same target `NotFoundScreen` uses: the workspace the
                     operator is still in when the path named one, their
                     landing route otherwise. A control they choose, never a
                     redirect (§11.2) — the URL of the crash stays in the bar
                     so they can tell you what they clicked.

                     The LABEL is not built here: see `ErrorBoundary.onEscape`.
                     Resolving a key on every healthy render for a string only
                     a crashed page shows is how a copy typo becomes a white
                     screen, which is the defect this boundary exists to end. */
                  onEscape={() =>
                    navigate(
                      route.workspace
                        ? `${route.workspace.routePrefix}/overview`
                        : (shell.session?.landingRoute ?? '/operations/overview'),
                    )
                  }
                >
                  <Outlet />
                </ErrorBoundary>
              </>
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
          /* The card stack formats dates and counts. Passed, not read from a
             context inside the cards, for the same reason `DeviceList` takes
             it: a formatter that reads the language itself is a second source
             for the one the shell already owns. */
          language={language}
          canAdministerTeam={shell.permissions.permissions.includes('manage_team')}
          /* A captain's two ways out of the sheet — the compliance file and the
             payouts ledger. Passed rather than read inside the layer, so the
             layer stays mountable without a shell above it, and §11.2 gets its
             answer: an operator without the permission sees the control
             disabled in place with its reason, not hidden and not offered. */
          canOpenCompliance={shell.permissions.permissions.includes(COMPLIANCE_VIEW_PERMISSION)}
          canOpenPayouts={shell.permissions.permissions.includes(PAYOUTS_VIEW_PERMISSION)}
          /* **The two writes the record sheets now offer.** The owner asked for
             the table's actions on the sheet the table opens, and each control
             is gated on the same permission its queue gates on — `live_ops` for
             a ride's flag, `manage_subscriptions` for a cycle's three commands.
             Read here because this is where the session is; the layer takes
             them as props so its suites can mount it without one. */
          canFlagTrips={shell.permissions.permissions.includes('live_ops')}
          canManageSubscriptions={shell.permissions.permissions.includes(
            'manage_subscriptions',
          )}
          /* **The address of another record, on this route.** The request sheet
             links to the rider waiting on the ride — the path from that queue
             to the person, which making the row open the RIDE would otherwise
             have removed. Built here because this is where the route lives;
             `ProfileLayer`'s own prop note says why it must not reach for the
             router itself. One layer at a time is still enforced by
             `withOverlay`, which is the same call `openLayer` makes. */
          entityHref={(id) =>
            `${location.pathname}${withOverlay(location.search, 'entity', id)}`
          }
        />
      )}
      {route.overlay === 'notifications' && (
        <NotificationsLayer
          open
          onClose={closeLayer}
          t={t}
          language={language}
          onOpenNotification={openNotificationTarget}
          onMarkRead={markNotificationAsRead}
          unreadCount={shell.notifications?.unread ?? 0}
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
          language={language}
        />
      )}
      {/* §10 — the fourth layer. `?onboarding=1`, an overlay **param**, never a
          route: browser Back closes it and stays put, and it does not consume a
          navigation level. One layer at a time is enforced by `withOverlay`,
          which deletes the other three params on every write (**AC-22**). */}
      {route.overlay === 'onboarding' && (
        <OnboardingLayer
          open
          onClose={closeLayer}
          t={t}
          initialStepId={route.overlayValue === '1' ? null : route.overlayValue}
          onStepChange={(stepId) => setLayer('onboarding', stepId ?? '1', { replace: true })}
        />
      )}

      {/* **AC-568**. Dismissible, unlike the re-auth modal: the session is
          alive, nothing is frozen, and cancelling is the safe outcome. */}
      <SignOutDirtyDialog
        open={confirmingSignOut}
        entity={shell.saveBar?.entity ?? null}
        t={t}
        onCancel={() => setConfirmingSignOut(false)}
        onConfirm={signOut}
      />

      {/* §8.1 rule 3 and **AC-563** — **one** visually-hidden reason element,
          referenced by `aria-describedby` from every frozen control. One id,
          one string, no per-control copy. A `title` attribute is hover-only and
          fails the criterion outright, which is why this is a `<p>` and not an
          attribute. */}
      <p id={FROZEN_REASON_ID} className="sr-only">
        {t('session.expiredReason')}
      </p>

      {/* §8.2 — the re-authentication modal. **A modal, not a fifth layer**
          (R4-3): a no-scrim layer does not trap, so `Tab` would walk the
          operator out of the only working control on screen into the frozen
          console behind it. It has no route and no URL param. */}
      {/* The drawer. Its content is portalled to the end of `body`, so this
          renders nothing in place; it is here, at the end of the frame, so the
          reading order of the DOM matches the reading order of the page. */}
      <MobileNavPanel
        workspaces={workspaces}
        visibleRows={rows}
        workspaceRows={workspaceRows}
        workspace={route.workspace}
        navCounts={shell.navCounts}
        navCountsLoading={shell.navCountsLoading}
        activeWorkspaceId={route.workspaceId}
        activeSubTabId={route.subTabId}
        landingRoute={shell.session?.landingRoute ?? '/operations/overview'}
        t={t}
      />

      {lifecycle.frozenReason !== null && (
        <ReauthModal
          open
          t={t}
          email={shell.session?.email ?? ''}
          reason={lifecycle.frozenReason}
          /* §8.3 — `{entity}` comes from the SaveBar's own dirty label, so the
             two surfaces name the same object (`copy.md` rule 5). `null` means
             nothing is dirty, and `Sign out` then needs no confirmation. */
          dirtyEntity={shell.saveBar?.entity ?? null}
          online={online}
          onResumed={() => lifecycle.resumed()}
          onSignOut={() => {
            /* The console the operator was standing in is about to be torn
               down, so the captured element is **released** rather than
               restored — putting focus back into a screen that is unmounting is
               worse than not. */
            focus.release()
            lifecycle.signOut()
            navigate('/signin', { replace: true })
          }}
        />
      )}
    </div>
    </MobileNavRoot>
  )
}

/**
 * §8.5's banner id, so `Save` can point `aria-describedby` at the sentence that
 * explains why it is disabled (**AC-666**: the surface names the permission).
 */
const WRITE_REVOKED_BANNER_ID = 'write-revoked-reason'

/** §3.2 / **AC-560** — idle and absolute are visibly distinct reasons. */
function endedCondition(reason: SessionExpiryReason, idleTimeoutMinutes: number) {
  return reason === 'absolute'
    ? ({ kind: 'session-ended-absolute' } as const)
    : ({ kind: 'session-ended-idle', minutes: idleTimeoutMinutes } as const)
}
