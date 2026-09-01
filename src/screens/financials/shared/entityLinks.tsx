/**
 * **P8-T1 on Financials** — 360° reach from every cell that names an entity.
 *
 * `OPERATOR-EXPERIENCE-PLAN.md` P8-T1: *"Open the 360° profile from **every**
 * cell that names an entity — captain, rider, trip, subscription, corporate
 * account, ticket."* Seven Financials sub-tabs render captain, rider, trip and
 * subscription names as **plain text**, so a Finance lead reading a payout run
 * cannot get from the captain who is owed 4,300 SAR to the captain.
 *
 * ## Where the link goes, and the one place it does not
 *
 * `?entity=<id>` on the current route — the overlay, exactly as
 * `operations/people`, `assurance`, `safety`, `fairness` and `requests` already
 * do it, through `withOverlay`. `/entity/:id` is the profile's **full-page
 * escape** (§3.10) and is not what a table cell opens; opening it would drop
 * the operator out of the list they were reading.
 *
 * **The exception is Rider Wallets, and it is a criterion rather than a
 * preference.** Spec §5: *"Rider Wallets is an index **of** ledgers … the
 * second level, reached by the identity link, is that rider's ledger … **the
 * boundary is the identity link**"*, and **AC-382** turns that into a test. So
 * on that one table the rider **name** stays the money view and the rider
 * **id**, on the cell's second line, carries the profile. Every other
 * Financials name cell — payout captain, escrow captain and rider, deduction
 * captain, cash-report captain, refund rider, credit-note buyer — has its money
 * view on a separately labelled `View ledger` control already, so the name is
 * free to mean what it means everywhere else in the product: *who is this*.
 * The full argument, and why it was not resolved the other way, is in the
 * handoff.
 *
 * ## An unresolvable name is TEXT, never a dead link
 *
 * The fixtures contain references that resolve to nothing — `DED-…`'s
 * `TRP-8043` is on no trip, and an escrow hold names `RDR-1046`, who is on no
 * rider. A prefix test alone would render both as links into the profile's
 * not-found state, which is `LedgerCard`'s own rule turned inside out: *"a link
 * that resolves to nothing is a guess about the route table"* (**AC-474**).
 *
 * So resolution is **asked**, not assumed: the prefix decides whether an id is
 * worth asking about, and `resolveProfile` decides whether it exists. A 404 is
 * remembered as *"no"*; any other failure is remembered as nothing at all, so a
 * dropped request downgrades one cell to text for one render rather than
 * permanently.
 *
 * **This wants a batch client operation and there isn't one.** One
 * `resolveProfile` per distinct id is up to ~40 reads on a full page. The seam
 * needs `resolveProfiles(ids: readonly string[]): Promise<Record<string,
 * ProfileRef | null>>`; when it lands, `resolveMissing` below becomes one call
 * and nothing else in this file changes. Raised to mock-data-engineer in the
 * handoff.
 *
 * Rules applied
 *   §9.1 / AC-43
 *              the identity is **a link** — a real `<a>` with an `href`, so it
 *              is keyboard-focusable, middle-clickable and copyable. Never a
 *              `<span>` with an `onClick`, and never a `<button>`, which has no
 *              address to open in a new tab.
 *   §7.2       the focus ring is `globals.css`'s `:focus-visible` default.
 *              Nothing here removes an outline, so nothing here restores one.
 *   R20        one truncating line. A name cell cannot grow a row.
 *   AC-75      the accessible name is ONE key with a named placeholder, never
 *              a label concatenated at the call site.
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { resolveProfile } from '@/data/clients'
import { ApiError } from '@/data/types'
import { withOverlay } from '@/shell/routeState'
import type { Translate } from '@/lib'
import { cn } from '@/lib/utils'

/**
 * The id stems `resolveProfile` can answer for, restricted to the kinds a
 * Financials row actually names.
 *
 * It is a **pre-filter, not the answer**: it keeps `ESC-1052`, `CASH-0001`,
 * `DED-2201` and `PO-0001` — documents with no profile of their own — from
 * costing a 404 each. Everything that passes it is still asked.
 */
const PROFILE_ID_PREFIXES: readonly string[] = ['DRV-', 'RDR-', 'TRP-', 'SUB-', 'CORP-']

/**
 * Resolution is a property of the id, not of a screen, so it is remembered per
 * id for the life of the tab. `true` = it resolved; `false` = the server said
 * 404. An id that failed for any other reason is **absent**, so it is asked
 * again on the next render that needs it.
 */
const resolutionById = new Map<string, boolean>()

/** Test seam: `resetDataLayer()` does not know about this map. */
export function resetEntityLinkCache(): void {
  resolutionById.clear()
}

function isAskable(id: string): boolean {
  return PROFILE_ID_PREFIXES.some((prefix) => id.startsWith(prefix))
}

/**
 * `hrefFor(id)` — the profile overlay's address, or `null` when the id names
 * nothing this product can open.
 *
 * @param ids every candidate on the page, in any order, with nulls. Duplicates
 *   are expected: ten payout rows for six captains ask six questions.
 */
export function useEntityLinks(
  ids: ReadonlyArray<string | null | undefined>,
): (id: string | null | undefined) => string | null {
  const location = useLocation()
  const [settled, setSettled] = useState(0)

  /* The dependency is the SET, flattened — not the array identity, which is a
     fresh array on every render and would restart the effect forever. */
  const askable = ids
    .filter((id): id is string => typeof id === 'string' && id !== '' && isAskable(id))
    .sort()
  const key = [...new Set(askable)].join(',')

  useEffect(() => {
    if (key === '') return
    let live = true
    const unknown = key.split(',').filter((id) => !resolutionById.has(id))
    if (unknown.length === 0) return

    void (async () => {
      /* Sequential would be a page-load stall at 320 ms of mock latency each;
         these are independent reads with no ordering between them. */
      await Promise.all(
        unknown.map(async (id) => {
          try {
            await resolveProfile(id)
            resolutionById.set(id, true)
          } catch (error) {
            /* A 404 is an ANSWER and is remembered. A network failure, an abort
               or an injected fault is not — remembering one would turn a blip
               into a cell that is plain text until the tab is reloaded. */
            if (error instanceof ApiError && error.kind === 'not-found') {
              resolutionById.set(id, false)
            }
          }
        }),
      )
      if (live) setSettled((count) => count + 1)
    })()

    return () => {
      live = false
    }
  }, [key])

  return useCallback(
    (id: string | null | undefined) => {
      if (typeof id !== 'string' || id === '' || !isAskable(id)) return null
      if (resolutionById.get(id) !== true) return null
      return `${location.pathname}${withOverlay(location.search, 'entity', id)}`
      /* `settled` is a render trigger, not an input: the map it gates is
         module-scoped and mutated in place. Listing it is what re-renders the
         cell once its id has been answered for. */
    },
    [location.pathname, location.search, settled],
  )
}

/**
 * A name cell that opens its entity — or that is text, when there is no entity
 * to open.
 *
 * The two branches render the **same string in the same place**; only the
 * affordance differs. A cell that changed weight or colour when it happened to
 * be linkable would make an operator read "this row is different" off what is
 * really "this fixture is thin".
 */
export function EntityName({
  href,
  name,
  t,
  code = false,
  className,
}: {
  href: string | null
  name: ReactNode
  t: Translate
  /** §9.1 — semibold and tabular when the identity is a CODE (`TRP-7742`). */
  code?: boolean
  className?: string
}) {
  const shape = cn('block truncate', code && 'font-medium tabular-nums', className)

  if (href === null) {
    return (
      <span className={shape}>{code ? <bdi>{name}</bdi> : name}</span>
    )
  }

  return (
    <Link
      to={href}
      aria-label={t('fin.a11y.openProfile', { name: typeof name === 'string' ? name : '' })}
      className={cn(shape, 'rounded-sm text-foreground group-hover/row:underline')}
    >
      {code ? <bdi>{name}</bdi> : name}
    </Link>
  )
}
