/**
 * The page frame every Financials sub-tab mounts into, plus the two things all
 * seven share: the reporting period and the write gate.
 *
 * Rules applied
 *   §8 slot 1  **no back arrow** — these are index routes (§2.2).
 *   §8 / V4    the `meta` line is DERIVED FROM THE DATA ON SCREEN. On six of
 *              the seven it is the period, which changes when the period
 *              changes; a line that cannot move when the data moves does not
 *              belong there.
 *   §11.4 / R10
 *              **zero or ONE page-level banner.** Financials can raise four
 *              standing conditions at once — out of balance, refused postings,
 *              failed payouts, unmatched credit notes — so `mergeBanners`
 *              reduces them to one carrying a count, at the highest tone
 *              present. Two banners on one page is the defect R10 names.
 *   §8 slot 4  **no page-level primary.** Nobody creates a ledger. Every act
 *              Financials offers acts on a row or on a document, and R3's one
 *              primary is better spent nowhere than on an invented flow.
 */

import { useCallback, useMemo, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { DEFAULT_FINANCIALS_PERIOD } from '@/data/clients'
import type { FinancialsPeriod, SubTabRoute } from '@/data/types'
import { Banner, mergeBanners, type BannerModel } from '@/components/Banner'
import { PageHeader } from '@/components/PageHeader'
import { SingleColumnPage } from '@/components/PageShell'
import { formatDate, type Direction, type Language, type Translate } from '@/lib'
import { canWriteSubTab, permissionContext } from '@/shell/permissions'
import { useShell } from '@/shell/ShellContext'

/* ────────────────────────────── the period ──────────────────────────────── */

/**
 * `?from=` and `?to=`, defaulting to the month the fixed clock is in.
 *
 * **A search param, never a path segment** (foundation §3.8.3): the period is a
 * control over one resource, not a level of navigation, and an operator has to
 * be able to send a colleague the exact window they are looking at.
 *
 * **AC-353** — changing it changes every tile, which is structural here: the
 * period is a `useAsync` dependency, so a change re-reads rather than
 * re-filtering something already on screen.
 */
export function usePeriod(): {
  period: FinancialsPeriod
  setPeriod: (next: FinancialsPeriod) => void
  isDefault: boolean
} {
  const location = useLocation()
  const navigate = useNavigate()

  const period = useMemo<FinancialsPeriod>(() => {
    const params = new URLSearchParams(location.search)
    const start = params.get('from')
    const end = params.get('to')
    if (start && end) return { start, end }
    return DEFAULT_FINANCIALS_PERIOD
  }, [location.search])

  const setPeriod = useCallback(
    (next: FinancialsPeriod) => {
      const params = new URLSearchParams(location.search)
      params.set('from', next.start)
      params.set('to', next.end)
      navigate({ pathname: location.pathname, search: `?${params.toString()}` })
    },
    [navigate, location.pathname, location.search],
  )

  return {
    period,
    setPeriod,
    isDefault:
      period.start === DEFAULT_FINANCIALS_PERIOD.start &&
      period.end === DEFAULT_FINANCIALS_PERIOD.end,
  }
}

/** `1 Jun to 30 Jun` — one key, two named placeholders, no concatenation (AC-443). */
export function periodLabel(period: FinancialsPeriod, t: Translate, language: Language): string {
  return t('fin.overview.meta', {
    from: formatDate(`${period.start}T00:00:00+03:00`, { style: 'day-month', language }),
    to: formatDate(`${period.end}T00:00:00+03:00`, { style: 'day-month', language }),
  })
}

/* ─────────────────────────────── the gate ───────────────────────────────── */

export interface WriteGate {
  /**
   * §11.2 / **AC-434** — gate at RENDER. `false` disables the control **in
   * place** with its reason available; it never hides one and never enables one
   * that will be refused on click.
   */
  canWrite: boolean
  /** Already translated. Rendered as the control's title and its disabled reason. */
  reason: string
}

/**
 * Whether this operator may move money on this sub-tab.
 *
 * Two inputs, and neither is invented here:
 *
 *   - the route's own permission, through `canWriteSubTab`. **Every Financials
 *     row carries `permission: null` today** (Q-F2 / D4), so this half passes
 *     for everyone and the §10.2 Finance-role regression is live. The mechanism
 *     is wired and exercised on every render, so the day the seven permission
 *     values land, the disabled treatment appears with no change to a screen —
 *     the same argument `routes.tsx` makes for its own guard.
 *   - the session freeze (design/08 §7.3). A frozen console disables every
 *     mutating control while the session is being renewed, and Financials is
 *     the example that spec uses: *"a session can expire while a Finance lead
 *     is halfway through a payout adjustment."*
 */
export function useWriteGate(row: SubTabRoute, t: Translate): WriteGate {
  const shell = useShell()
  const allowed = canWriteSubTab(permissionContext(shell.session), row) && !shell.isFrozen
  return { canWrite: allowed, reason: t('fin.payout.blocked.permission') }
}

/* ─────────────────────────────── the page ───────────────────────────────── */

export interface FinancialsPageProps {
  row: SubTabRoute
  /** V4 — record-derived. The period, or a count of what is on screen. */
  meta?: string | null
  /**
   * §11.4 — every standing condition this screen has raised. Zero renders
   * nothing; two or more render **one** merged banner with a count.
   */
  banners?: readonly BannerModel[]
  /**
   * The reporting period, at the END OF THE TITLE ROW (§8 slot 4c). It had a
   * row of its own under the meta line: V-18's row of chrome, given back.
   */
  periodControl?: ReactNode
  /**
   * The screen's view switcher, ABOVE the banner so the strip does not move
   * when a view raises one (R10). The banner speaks for the content below it.
   */
  viewRow?: ReactNode
  t: Translate
  dir: Direction
  children: ReactNode
}

export function FinancialsPage({
  row,
  meta = null,
  banners = [],
  periodControl,
  viewRow,
  t,
  dir,
  children,
}: FinancialsPageProps) {
  const merged = useMemo(
    () =>
      mergeBanners([...banners], (count) =>
        t('state.merged.message', { count: String(count) }),
      ),
    [banners, t],
  )

  return (
    <SingleColumnPage
      header={
        <>
          <PageHeader
            title={t(row.titleKey)}
            meta={meta}
            control={periodControl}
            t={t}
            dir={dir}
          />
          {viewRow && (
            <div data-slot="view-row" className="pb-2">
              {viewRow}
            </div>
          )}
        </>
      }
      banner={merged ? <Banner banner={merged} className="mb-3" /> : undefined}
    >
      {children}
    </SingleColumnPage>
  )
}
