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

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  getNavCounts,
  getOnboarding,
  getSecurityPolicy,
  getSession,
  getNotificationSummary,
  type LegacyResolution,
} from '@/data/clients'
import type { NavCounts, NotificationSummary, SecurityPolicy, Session } from '@/data/types'
import type { OnboardingChecklist } from '@/data/types/onboarding'
import {
  useAsync,
  useLanguageState,
  useOnline,
  LanguageContext,
  type AsyncStatus,
  type FormStatus,
  type LanguageState,
} from '@/hooks'
import { DICTIONARIES } from '@/i18n/dictionaries'
import { setUiStateOwner } from '@/lib/persistence'
import { permissionContext, type PermissionContext } from './permissions'
import { useSessionLifecycle, type SessionExpiryReason, type SessionLifecycle } from './session'

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

  /* ─────────────────── the session lifecycle (design/08 §8) ──────────────── */

  /**
   * Sign-in status, expiry reason, the freeze, and the idle warning —
   * `session.ts`. The **freeze contract** is the expensive half: spec §7.3
   * calls it *"the most important rule in §7 and the one an implementation will
   * get wrong."*
   *
   * It lives on the shell rather than on a route because it outlives every
   * route: the whole point is that a session can expire while a Finance lead is
   * halfway through a payout adjustment, and **nothing unmounts**.
   */
  session_lifecycle: SessionLifecycle

  /**
   * **`true` while the console is frozen** — every text input `readOnly`
   * (never `disabled`), every mutating button `disabled`, reads stopped.
   *
   * Exposed as a plain boolean because every screen that has a form needs it
   * and none of them needs the reason. `FROZEN_REASON_ID` is the one string
   * they all point `aria-describedby` at (**AC-563**).
   */
  isFrozen: boolean

  /**
   * §8.5 — `write-permission-revoked-while-dirty`. Set by whoever notices the
   * permission behind a pending save has gone; rendered as **one page-level
   * `critical` banner** (R5a use #2) with `Save` disabled, `Discard` still
   * enabled, and the form's content still on screen and **selectable**.
   *
   * `null` when no permission has been revoked. The value is the permission's
   * name, because **AC-666** requires the surface to name it.
   */
  writeRevokedPermission: string | null
  setWriteRevokedPermission: (permission: string | null) => void

  /**
   * The operator's own onboarding track — design §10.
   *
   * **Read at the shell, not inside the layer**, for one reason: the
   * account-menu entry carries `{done} / {total}` **at all times** (**AC-598**,
   * **AC-599**), whether or not the layer has ever been opened. A read that
   * lived in the layer would leave the menu with nothing to show until the
   * operator opened the thing the menu is supposed to be advertising.
   *
   * `null` while loading and on failure. A failed checklist read must not stop
   * the console: the menu simply shows no count, which is the same thing it
   * shows for a dismissed track (**AC-599**).
   */
  onboarding: OnboardingChecklist | null
  /** `loading` | `error` | `content` — the layer renders all four states from it. */
  onboardingStatus: AsyncStatus
  refreshOnboarding: () => void

  /**
   * `AppLayout` hands the provider the two things only a routed component can
   * do: close every open shell layer (§8.1 rule 5) and redirect to `/signin`
   * on a **clean** expiry (§8.1 branch 1).
   *
   * Registration rather than a prop, because `ShellProvider` sits **above** the
   * router — it has no `useNavigate` and must not grow one, since that is the
   * whole reason `AC-18` holds (the provider is never remounted by a
   * navigation).
   */
  registerLayerCloser: (closer: () => void) => void
  registerCleanExpiry: (handler: (reason: SessionExpiryReason) => void) => void
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
  /**
   * **None of this provider's reads carry a `cacheKey` (P3-13), deliberately.**
   *
   * `ShellProvider` is mounted once for the session and above the router
   * (`routes.tsx:17`), so no entry it wrote would ever be read a second time —
   * the cache would cost a key and buy nothing.
   *
   * `session.current` is the one that would also be *wrong*: it is keyed on
   * `[]` because `getSession` takes no argument, but the answer is
   * "whoever is signed in". `switchUser` calls `shell.retry()`, which is
   * `refetch` and bypasses the cache — but any future component that read
   * `session.current` under the same empty key would inherit the previous
   * operator's identity for the TTL. Identity is the last thing that may go
   * stale, so the seam stays closed here.
   */
  const session = useAsync<Session>((signal) => getSession(signal), { deps: [] })

  /**
   * **D16 — who the cached UI state belongs to.**
   *
   * The cache is namespaced per operator, and **nothing is written until this
   * runs**: an unowned write goes to the memory tier only, so an anonymous boot
   * cannot deposit a value into a namespace the next operator would read. That
   * makes this line the difference between a persistence seam and an elaborate
   * in-memory store — without it every test still passes, every read still
   * returns the correct empty result, and no preference ever survives a reload.
   *
   * Set here rather than at the sign-in screen because this is the one place
   * that knows who is signed in on *every* path into the app — a fresh sign-in,
   * a restored session, and a switch between operators all resolve through the
   * same `getSession` read. Clearing is not symmetrical and does not belong
   * here: see `signOut` in `./session.ts` for why an effect cannot tell a
   * sign-out from a refetch.
   */
  useEffect(() => {
    /**
     * **`undefined` means "not resolved yet" and must not be treated as "nobody".**
     *
     * This ran as `session.data?.userId ?? null`, so its FIRST pass — before
     * `getSession` has answered — called `setUiStateOwner(null)`. That is not a
     * no-op: it clears the remembered owner from storage and drops every default
     * store. The remembered owner exists for exactly one purpose, stated on
     * `uiStateOwnerId` itself — *"so the next boot knows the namespace during
     * its first render rather than one async hop later"* — and this effect was
     * throwing it away one render before it was needed.
     *
     * The cost was a preference that silently would not stick. Every cached read
     * during that window returns from memory without touching storage, because
     * a null owner has no namespace to read. `getUiState` lands inside it, finds
     * an empty cache, seeds the mock bag from defaults, latches `mockHydrated`,
     * and writes the default back over the cached value. An operator switched to
     * Arabic, navigated once, and was in English again — with the correct value
     * still sitting in `localStorage` under the correct key, never read.
     *
     * Clearing on sign-out is `signOut`'s job and already handled there, which
     * the note above already said; the `?? null` contradicted it.
     */
    const userId = session.data?.userId
    if (userId === undefined) return
    setUiStateOwner(userId)
  }, [session.data?.userId])

  /* §8.4 — a NETWORK read, not a constant, which is what makes §9.1's
     "labels render immediately, only the badges are skeletons" honourable. */
  const counts = useAsync<NavCounts>((signal) => getNavCounts(signal), { deps: [] })

  const notifications = useAsync<NotificationSummary>((signal) => getNotificationSummary(signal), {
    deps: [],
  })

  /* One read, at the shell, for the whole session.
     **The signed-in operator's own track**, and the `userId` is passed
     explicitly: `getOnboarding()` with no argument falls back to the mock's
     `CURRENT_USER_ID` rather than to whoever the session says is signed in, so
     an omitted argument silently serves one operator another operator's
     checklist the moment the two differ. `deps` carries the id, so a switch
     re-reads.

     The account-menu entry needs these counts **before the layer has ever been
     opened** (**AC-599**) — which is why the read is here and not inside the
     layer. It is also the single source the layer itself renders from, so the
     menu's `n / m` cannot drift from the list the operator is looking at. */
  const onboarding = useAsync<OnboardingChecklist>(
    (signal) => getOnboarding(session.data?.userId, signal),
    { deps: [session.data?.userId], enabled: session.data !== null },
  )

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
  const [writeRevokedPermission, setWriteRevokedPermission] = useState<string | null>(null)

  /* §11.6 row 20 — the shell's `offline` banner has had copy and a flag since
     the shell was built and **nothing has ever set the flag**. `useOnline` is
     the missing producer, and it is read here rather than in `ShellBanner` so
     that one value feeds the banner, the auth card and the re-auth modal. A
     manually set `offline` still wins, for the test that sets it. */
  const online = useOnline()

  /* §8.1's branch is decided on the SaveBar, and it has to be read at the
     instant of expiry rather than at the render that armed the timer — a form
     can go dirty in the last second of the idle window. A ref, therefore, not
     a dependency. */
  const saveBarRef = useRef<SaveBarModel | null>(saveBar)
  saveBarRef.current = saveBar

  /* §8.1 rule 5 — **every open shell layer closes first.** Tier 3 may not
     composite over tier 2 (R4-3 §3.2), because §5.0 forbids a modal nested in a
     drawer. The layer is a URL param, so closing it is a navigation, which the
     provider cannot do — `AppLayout` registers the closer here. **Form state is
     preserved; overlay state is not**, and those are different things. */
  const closeLayersRef = useRef<() => void>(() => {})
  const registerLayerCloser = useCallback((closer: () => void) => {
    closeLayersRef.current = closer
  }, [])

  const cleanExpiryRef = useRef<(reason: SessionExpiryReason) => void>(() => {})
  const registerCleanExpiry = useCallback((handler: (reason: SessionExpiryReason) => void) => {
    cleanExpiryRef.current = handler
  }, [])

  /**
   * **§7.1's idle window, from the setting rather than from a constant.**
   *
   * `DEFAULT_IDLE_TIMEOUT_MINUTES` was the only source, so Admin › Team &
   * Access could persist a session lifetime that nothing ever read: the setting
   * saved, the console kept signing people out at 30, and the admin had a
   * confirmation that their change had taken effect. `getSecurityPolicy` is
   * seeded to the same 30, so wiring it changes no behaviour today and makes
   * the setting real the moment it is edited.
   *
   * `undefined` while the read is in flight takes the hook's own fallback,
   * which is that same 30 — so there is no window in which the console runs on
   * a number nobody chose. The clamp (5…240) stays in the hook, and the client
   * refuses the same range with a 422, so neither end can be talked past.
   */
  const securityPolicy = useAsync<SecurityPolicy>((signal) => getSecurityPolicy(signal), {
    deps: [],
  })

  const sessionLifecycle = useSessionLifecycle({
    idleTimeoutMinutes: securityPolicy.data?.idleTimeoutMinutes,
    isDirty: useCallback(
      () => saveBarRef.current !== null && saveBarRef.current.status !== 'clean',
      [],
    ),
    onCleanExpiry: useCallback((reason: SessionExpiryReason) => {
      cleanExpiryRef.current(reason)
    }, []),
    onFreeze: useCallback(() => {
      closeLayersRef.current()
    }, []),
  })

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
      conditions: { ...conditions, offline: conditions.offline || !online },
      setConditions,
      saveBar,
      setSaveBar,
      lastLegacyResolution,
      setLastLegacyResolution,
      onboarding: onboarding.data,
      onboardingStatus: onboarding.status,
      refreshOnboarding: onboarding.refetch,
      session_lifecycle: sessionLifecycle,
      isFrozen: sessionLifecycle.frozenReason !== null,
      writeRevokedPermission,
      setWriteRevokedPermission,
      registerLayerCloser,
      registerCleanExpiry,
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
      onboarding.data,
      onboarding.status,
      onboarding.refetch,
      permissions,
      language,
      conditions,
      setConditions,
      saveBar,
      lastLegacyResolution,
      online,
      sessionLifecycle,
      writeRevokedPermission,
      registerLayerCloser,
      registerCleanExpiry,
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
