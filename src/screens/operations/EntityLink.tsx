/**
 * **P8-T1 on Operations** — 360° reach from every cell that names an entity,
 * and the rule that an unresolvable name is **text**.
 *
 * `OPERATOR-EXPERIENCE-PLAN.md` P8-T1: *"Open the 360° profile from **every**
 * cell that names an entity — captain, rider, trip, subscription, corporate
 * account, ticket."* On Trips and Subscriptions those cells were
 * `<button onClick={navigate}>` carrying `focus:outline-none` with nothing in
 * its place: not middle-clickable, no copyable address, and no focus ring.
 *
 * ## Resolution is ASKED, not assumed — and this is the second cut
 *
 * The first version of this file linked on the **presence of an id** and let
 * the profile overlay's `overlay-not-found` state absorb a miss. That is not
 * what P8-T1 asks for. *"A name whose entity cannot be resolved renders as
 * plain text, not a dead link"* means the cell knows **before** the click;
 * discovering the miss afterwards is gating at commit, which is the shape
 * §11.2 exists to replace.
 *
 * So the contract here is `screens/financials/shared/entityLinks.tsx`'s,
 * deliberately and to the letter:
 *
 *   - **the prefix decides whether an id is worth asking about**, so
 *     `REQ-0007`, `INC-014` and `WRK-…` — records with no profile of their own —
 *     never cost a 404 each;
 *   - **`resolveProfile` decides whether it exists**;
 *   - **a 404 is remembered as *no*. Any other failure is remembered as
 *     nothing at all**, so a dropped request downgrades one cell to text for
 *     one render rather than permanently. That asymmetry is the part of the
 *     contract most easily lost in a re-implementation, and it is the reason
 *     this file says so twice.
 *
 * ## Why this is a second copy and not an import
 *
 * `queues/cells.tsx` set the precedent and states the reason: *"a screen
 * reaching into another screen's directory is the first step to two screens
 * owning one file."* An `operations → financials` import would be exactly that,
 * across two workspaces with different owners.
 *
 * **The contract does not differ. One thing does, and it is named here rather
 * than left to be found:** `PROFILE_ID_PREFIXES` below carries four stems the
 * Financials list does not, because Operations rows name entities Financials
 * rows do not — a trip's `paymentId`, an applicant, a ticket, a complaint. The
 * prefix list is a per-workspace pre-filter of *which ids are worth asking
 * about* — Financials' own comment scopes it that way — so extending it is
 * inside the contract, not a divergence from it.
 *
 * Consolidating the two into one shared module is asked for in the handoff. It
 * belongs in `src/lib` or a shared `screens/` module, not in either workspace,
 * and that is a single-owner file.
 *
 * ## The batch operation this wants, and the workaround not to build
 *
 * One `resolveProfile` per **distinct** id, up to ~40 on a full page. The seam
 * needs `resolveProfiles(ids)`; when it lands, the loop below becomes one call
 * and nothing else changes. An N-call loop a batch endpoint will replace is
 * fine; a hand-rolled cache layer that then has to be unpicked is not, which is
 * why there is nothing here but a `Map` of answers.
 *
 * Rules applied
 *   §9.1 / AC-43
 *              the identity is **a link** — a real `<a>` with an `href`, so it
 *              is keyboard-focusable, middle-clickable and copyable. Never a
 *              `<span>` with an `onClick` (the legacy app has 253 of those),
 *              and never a `<button>`, which has no address to open in a tab.
 *   §11.2      a name with nothing behind it is TEXT with its reason, and the
 *              reason is a real element pointed at by `aria-describedby` —
 *              never a `title`, which §5.7 confines to naming a control and
 *              which no keyboard user ever sees.
 *   §7.2       the focus ring is `globals.css`'s `:focus-visible` default.
 *              Nothing here removes an outline, so nothing here restores one.
 *   R20        one truncating line. A name cell cannot grow a row.
 *   AC-75      the accessible name is ONE key with a named placeholder, passed
 *              in already interpolated. Never concatenated here.
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { resolveProfile } from '@/data/clients'
import { ApiError } from '@/data/types'
import { withOverlay } from '@/shell/routeState'
import { cn } from '@/lib/utils'

/**
 * The id stems `resolveProfile` can answer for, restricted to the kinds an
 * Operations row actually names.
 *
 * It is a **pre-filter, not the answer**: it keeps `REQ-…`, `INC-…`, `FC-…`,
 * `APP-`-less work keys and every other document with no profile of its own
 * from costing a 404 each. Everything that passes it is still asked.
 *
 * The last four are the divergence from the Financials list, and they are
 * there because Operations names those entities and Financials does not: a
 * trip's `paymentId`, a captain application, a ticket, a complaint.
 */
const PROFILE_ID_PREFIXES: readonly string[] = [
  'DRV-',
  'RDR-',
  'TRP-',
  'SUB-',
  'CORP-',
  'PAY-',
  'APP-',
  'TKT-',
  'CMP-',
]

/**
 * Resolution is a property of the id, not of a screen, so it is remembered per
 * id for the life of the tab. `true` = it resolved; `false` = the server said
 * 404. An id that failed for any **other** reason is absent from the map, so it
 * is asked again on the next render that needs it — remembering a blip would
 * leave a cell as plain text until the tab is reloaded.
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
 * `?entity=<id>` on the **current** route (**AC-21**, **AC-22**), so opening a
 * captain from a trip list never loses the filtered, sorted, paged list behind
 * it. `/entity/:id` is the profile's full-page escape (§3.10) and is not what a
 * table cell opens.
 *
 * @param ids every candidate on the page, in any order, with nulls. Duplicates
 *   are expected and are asked about once: twelve trips for six captains ask
 *   six questions.
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
      /* Sequential would be a page-load stall at the mock's latency each; these
         are independent reads with no ordering between them. */
      await Promise.all(
        unknown.map(async (id) => {
          try {
            await resolveProfile(id)
            resolutionById.set(id, true)
          } catch (error) {
            /* **A 404 is an ANSWER and is remembered. A network failure, an
               abort or an injected fault is not.** Remembering one would turn a
               blip into a permanently downgraded cell. */
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

export interface EntityLinkProps {
  /**
   * From `useEntityLinks`' `hrefFor`. **`null` means there is nothing to
   * open** — the row carries no id, or the resolver said the id names nothing —
   * and `reason` then says which.
   */
  href: string | null
  /** What the operator reads. Never the id when a name is available. */
  children: ReactNode
  /** The link's accessible name, already interpolated. One key (**AC-75**). */
  label: string
  /** §11.2 — why there is nothing to open. Required whenever `href` is `null`. */
  reason?: string | null
  /** A stable id for the reason element, so `aria-describedby` can point at it. */
  reasonId?: string
  className?: string
  /** §9.1 — semibold and tabular when the name is a CODE (`TRP-7741`). */
  code?: boolean
}

/**
 * A name cell that opens its entity — or that is text, when there is no entity
 * to open.
 *
 * **Both branches render the same string in the same place**; only the
 * affordance differs. A cell that changed weight or colour when it happened to
 * be linkable would make an operator read *"this row is different"* off what is
 * really *"this fixture is thin"*.
 */
export function EntityLink({
  href,
  children,
  label,
  reason = null,
  reasonId,
  className,
  code = false,
}: EntityLinkProps) {
  const shape = cn('truncate', code && 'font-medium tabular-nums', className)

  if (href === null) {
    return (
      /* Plain text, muted, and NOT a control. A disabled link is still a link
         to a screen reader; text is text. The reason is a sibling element
         rather than a `title`, because §5.7 confines a tooltip to naming a
         control and a keyboard user never sees one. */
      <span className={cn(shape, 'text-muted-foreground')} aria-describedby={reasonId}>
        {code ? <bdi>{children}</bdi> : children}
        {reason !== null && reasonId !== undefined && (
          <span id={reasonId} className="sr-only">
            {reason}
          </span>
        )}
      </span>
    )
  }

  return (
    <Link
      to={href}
      aria-label={label}
      /* `group-hover/row:underline` matches `Identity`: the row's hover says the
         row has somewhere to go, and the link is still the only click target —
         §9.1 keeps the row itself out of it. */
      className={cn(shape, 'rounded-sm text-foreground hover:underline group-hover/row:underline')}
    >
      {code ? <bdi>{children}</bdi> : children}
    </Link>
  )
}
