/**
 * The shell's own state, mounted once for the lifetime of the session — spec
 * §4.1, §4.4, §8.2, §8.3, §8.4.
 *
 * Everything here is either identity, nav counts, or a flag the operator set.
 * **No route state lives here** — that is `routeState.ts`, derived from the URL
 * (AC-08). Putting the active workspace in a context is how `go(id, el)` gets
 * reinvented.
 *
 * §4.1: these regions are "mounted exactly once for the lifetime of the session
 * and are never remounted by navigation" (**AC-18**). The provider therefore
 * sits ABOVE the router outlet, and `useAsync`'s reads have empty `deps`, so a
 * route change never refetches identity or counts.
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import {
  getNavCounts,
  getSession,
  getNotificationSummary,
  type LegacyResolution,
} from '@/data/clients'
import type { NavCounts, NotificationSummary, Session } from '@/data/types'
import {
  useAsync,
  useLanguageState,
  LanguageContext,
  type AsyncStatus,
  type FormStatus,
  type LanguageState,
} from '@/hooks'
import { DICTIONARIES } from '@/i18n/dictionaries'
import { permissionContext, type PermissionContext } from './permissions'

/* ─────────────────────────── the save bar (§2.3) ────────────────────────── */

/**
 * What a route hands the shell so the shell can render the save bar. **This is
 * `useForm`'s output, forwarded — not recomputed.**
 *
 * `status` is `FormStatus` verbatim, and it maps 1:1 onto §11.6 rows 5–9. The
 * three booleans are `form.canSave` / `form.canDiscard` / `form.isSaving`, and
 * a screen must pass them through rather than re-deriving them from `isDirty`
 * and `errors` — that is precisely how rows 6 and 7 drift apart, and
 * `canDiscard` in particular is **never gated on validity** (**AC-52**).
 *
 * The one thing `useForm` cannot supply is `entity`: §2.3 wants the dirty label
 * to be ENTITY-SPECIFIC when a named record is being edited (`Unsaved plan`)
 * and generic otherwise, and the form state holds no entity noun. It is held
 * here as the NOUN, never as a built string, so the label resolves through one
 * key with a placeholder (**AC-75**).
 */
export interface SaveBarModel {
  status: FormStatus
  entity: string | null
  canSave: boolean
  canDiscard: boolean
  isSaving: boolean
  onSave: () => void
  onDiscard: () => void
}

/* ─────────────────── standing conditions → the shell banner ─────────────── */

/**
 * §4.2. **At most one banner ever renders** (R10, **AC-40**); two or more true
 * conditions MERGE into one carrying a count. The merge lives in
 * `ShellBanner`, not here — this is just the set of what is true.
 */
export interface ShellConditions {
  impersonating: { name: string } | null
  call: { name: string; duration: string } | null
  offline: boolean
}

/* ──────────────────────────── the context ───────────────────────────── */

export interface ShellState {
  /** §9.1 — the shell's own four states. `content` is the only one that renders a route. */
  status: AsyncStatus
  session: Session | null
  error: Error | null
  retry: () => void

  /** §8.4. `null` while loading — the LABELS still render; only the BADGES skeletonise. */
  navCounts: NavCounts | null
  navCountsLoading: boolean

  /** The bell badge. **No badge at zero** (**AC-26**). */
  notifications: NotificationSummary | null
  refreshNotifications: () => void

  permissions: PermissionContext
  /* `nav` is GONE. The sub-tab column no longer collapses (`DECISIONS.md`
     **D5**), so there is no flag, no toggle and no setter — and no in-memory
     store quietly failing AC-33 on the unanswered Q1. */
  language: LanguageState

  conditions: ShellConditions
  setConditions: (next: Partial<ShellConditions>) => void

  saveBar: SaveBarModel | null
  /** A route reports its own dirty state; the shell renders the bar. §9.2 state 5. */
  setSaveBar: (next: SaveBarModel | null) => void

  /** Global search's last legacy-name resolution, so the escape hatch can name it (**AC-30**). */
  lastLegacyResolution: LegacyResolution | null
  setLastLegacyResolution: (next: LegacyResolution | null) => void
}

const ShellStateContext = createContext<ShellState | null>(null)

export function useShell(): ShellState {
  const value = useContext(ShellStateContext)
  if (value === null) throw new Error('useShell was called outside a ShellProvider.')
  return value
}

/* ──────────────────────────── the provider ──────────────────────────── */

export function ShellProvider({ children }: { children: ReactNode }) {
  /* Identity and permissions. §9.1's ERROR state is "identity or permissions
     could not be loaded" — page-scoped, shell intact, retry as an imperative.
     `useAsync` supplies all four states from one promise; `AC-36` induces the
     failure through the mock's registry without editing source. */
  const session = useAsync<Session>((signal) => getSession(signal), { deps: [] })

  /* §8.4 — a NETWORK read, not a constant, which is what makes §9.1's
     "labels render immediately, only the badges are skeletons" honourable. */
  const counts = useAsync<NavCounts>((signal) => getNavCounts(signal), { deps: [] })

  const notifications = useAsync<NotificationSummary>((signal) => getNotificationSummary(signal), {
    deps: [],
  })

  /* AC-70 — `dir` and `lang` on the DOCUMENT ELEMENT, not a subtree. */
  const language = useLanguageState({ dictionaries: DICTIONARIES })

  const [conditions, setConditionsState] = useState<ShellConditions>({
    impersonating: null,
    call: null,
    offline: false,
  })
  const setConditions = useCallback((next: Partial<ShellConditions>) => {
    setConditionsState((current) => ({ ...current, ...next }))
  }, [])

  const [saveBar, setSaveBar] = useState<SaveBarModel | null>(null)
  const [lastLegacyResolution, setLastLegacyResolution] = useState<LegacyResolution | null>(null)

  const permissions = useMemo(() => permissionContext(session.data), [session.data])

  const value = useMemo<ShellState>(
    () => ({
      status: session.status,
      session: session.data,
      error: session.error,
      retry: session.refetch,
      navCounts: counts.data,
      navCountsLoading: counts.status === 'loading',
      notifications: notifications.data,
      refreshNotifications: notifications.refetch,
      permissions,
      language,
      conditions,
      setConditions,
      saveBar,
      setSaveBar,
      lastLegacyResolution,
      setLastLegacyResolution,
    }),
    [
      session.status,
      session.data,
      session.error,
      session.refetch,
      counts.data,
      counts.status,
      notifications.data,
      notifications.refetch,
      permissions,
      language,
      conditions,
      setConditions,
      saveBar,
      lastLegacyResolution,
    ],
  )

  return (
    <LanguageContext.Provider value={language}>
      <ShellStateContext.Provider value={value}>{children}</ShellStateContext.Provider>
    </LanguageContext.Provider>
  )
}

/* ── dev-only: HMR must not mint a second context ─────────────────────────
   This module creates a React context at module scope AND exports a component,
   so Vite's React plugin makes it self-accepting. Fast Refresh then replaces
   the module in place on every edit — and `createContext` runs again, minting a
   NEW context object while the already-mounted tree still reads the OLD one.
   Every consumer reads `null` and the next render throws

       useShell was called outside a ShellProvider.
       at useShell (ShellContext.tsx) / at AppLayout (AppLayout.tsx)

   from a tree that is, in fact, correctly wrapped. It is a false alarm that
   costs a real debugging session, and it fires whenever anyone edits a shell
   file with the app open — which, with several people in this tree at once, is
   most of the time.

   `invalidate()` inside the accept handler declines the in-place swap and asks
   Vite to propagate to importers instead, which ends in a full reload. Slower
   than a hot swap, and correct instead of a lie. Dev only: the whole block is
   `import.meta.hot`-guarded, so it is dead code in the production bundle. */
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    import.meta.hot?.invalidate()
  })
}
