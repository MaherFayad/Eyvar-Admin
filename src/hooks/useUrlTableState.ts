/**
 * Where an index table's question lives: **the URL**. P1-T1,
 * `OPERATOR-EXPERIENCE-PLAN.md` §0.1 finding 1.
 *
 * Before this file, search text, filters, sort and page lived in `useState`
 * inside `useIndexTable`. So opening a captain from a filtered, sorted, page-3
 * list and pressing Back returned an unfiltered page 1; a refresh lost the
 * whole query; and a filtered view could not be bookmarked, sent to a
 * colleague, or written into a runbook. Twenty index screens shared that one
 * defect, which is why it is fixed here and in no screen.
 *
 * ## It extends `routeState.ts`, it does not compete with it
 *
 * `src/shell/routeState.ts` states the principle: *"Both nav columns, the back
 * arrow, the title pair, the page shape and the open shell layer are DERIVED
 * from the URL. No handler anywhere sets an active state."* The same applies
 * here. `q`, `page`, `sort` and `filter` are **read out of `location.search` on
 * every render**; the setters navigate and nothing else. Nothing is mirrored
 * into a `useState` that could disagree with the address bar, which is also why
 * Back needs no restore code: the location changes and the derivation follows.
 *
 * `?view=` stays `routeState.ts`'s. It has one writer (`withView`) and this file
 * is not a second one — it only *reads* it, as a scope (below).
 *
 * ## The grammar is the wire's grammar
 *
 * `src/data/clients/http.ts` already defines how a `QueryParams` becomes a query
 * string for the real API:
 *
 * ```
 *   page    1-based integer            sort    `field:asc` / `field:desc`
 *   q       free text                  filter  repeated, `field:op:value`,
 *   view    view-tab id                        arrays comma-joined
 * ```
 *
 * Every value written below is produced **by calling `toSearchParams` itself**,
 * not by a second formatter that looks like it. If the server disagrees with
 * the wire format, `toSearchParams` changes and the address bar changes with
 * it — one grammar, and it cannot drift, because there is only one renderer.
 * The parsers here are its inverse and `useIndexTable.test.ts` asserts the
 * round trip against `toSearchParams` rather than against a literal.
 *
 * Two things are deliberately **not** written:
 *
 * - **`view`** — `routeState.ts` owns `?view=` (above).
 * - **`pageSize`** — not operator-settable today; a fixed screen option. Writing
 *   it would be writing a default into the address. It becomes URL state when
 *   P1-T5 gives it a control.
 *
 * ## Absent means default; a default is never written
 *
 * A URL with no `page` is page 1. A URL with no `sort` is the screen's
 * `initialSort`. An unfiltered list therefore has a **clean address** — which is
 * the whole reason a shared link reads as a question and not as noise.
 *
 * That leaves one thing the plain "absent = default" rule cannot say: *the
 * operator cleared a default*. `clearSort()` on a table whose `initialSort` is
 * `slaDueAt:asc`, or `Clear all` on My Work whose `initialFilters` carry
 * `routedToMyRole`, must not silently come back on the next read. So an
 * **empty parameter value means "explicitly none"**: `?sort=` is unsorted,
 * `?filter=` is no filters. `toSearchParams` never emits either form — a null
 * sort is simply absent on the wire — so the empty value is a URL-only
 * affordance that serialises to *nothing* on the request, which is exactly what
 * it means.
 *
 * ## Scope: why a second table on the same address does not steal the first's query
 *
 * Several screens mount one table per view tab — Cash & Captain Debt, Payouts,
 * Ledger controls, Pricing, Revenue, Assurance. `withView` preserves the rest of
 * the query string, so a bare `?sort=captain:asc` set on one pane would survive
 * the tab switch and be handed to a pane with entirely different columns, where
 * `runQuery` throws `Unknown sort field` and the operator lands in an error
 * state they did not cause. That is a defect this change would have *created*,
 * on six screens.
 *
 * So the parameter names are **scoped by the view they were asked under**:
 *
 * ```
 *   no ?view= (the default tab)   ?q=nora&sort=name:asc&page=3
 *   ?view=debts                   ?view=debts&debts.q=nora&debts.sort=age:desc
 * ```
 *
 * The *values* are byte-identical to the wire in both cases; only the key
 * carries the scope. Because the scope travels in the address, going back to a
 * tab restores that tab's own question, and orphaned scopes are left alone
 * rather than swept — sweeping them is what would break Back.
 *
 * Two tables mounted **simultaneously** under the same view still share one
 * namespace (`DisputesScreen` is the only such screen today, and both of its
 * tables read local fixtures, so the effect is cosmetic). A screen that needs
 * them separated passes `urlKey`, which is appended to the scope.
 *
 * ## Router-optional on purpose
 *
 * `useLocation()` throws outside a `<Router>`, and `src/components/table/
 * tableControls.test.tsx` renders `useIndexTable` with no router. Reading the
 * two contexts directly returns `null` there instead of throwing, and the hook
 * falls back to the `useState` store it has always had. Same public API, same
 * behaviour, no URL. `urlState: false` selects that path explicitly.
 */

import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { UNSAFE_LocationContext, UNSAFE_NavigationContext } from 'react-router-dom'
/* Deep import, not the `@/data/clients` barrel: the barrel pulls every mock
   client into the graph, and a table hook needs one 14-line serialiser. */
import { toSearchParams } from '@/data/clients/http'
import type { FilterOperator, FilterSpec, FilterValue, SortSpec } from '@/data/types/common'
import { DEFAULT_DEBOUNCE_MS, useDebouncedValue } from './useDebouncedValue'
import { hasActiveFilters, useFilters, withFilter, withoutFilter } from './useFilters'

/* ────────────────────────────── the grammar ────────────────────────────── */

/** The four parameter names, unscoped. `view` and `pageSize` are not ours — see the header. */
const PARAM = { q: 'q', page: 'page', sort: 'sort', filter: 'filter' } as const

/**
 * Exhaustive by construction: adding a member to `FilterOperator` without
 * adding it here is a compile error, so an operator can never round-trip
 * through the URL as a silently dropped filter.
 */
const FILTER_OPERATORS: Readonly<Record<FilterOperator, true>> = {
  eq: true,
  neq: true,
  in: true,
  nin: true,
  gt: true,
  gte: true,
  lt: true,
  lte: true,
  contains: true,
  between: true,
  isNull: true,
  isNotNull: true,
}

/** Ops whose `value` is a list. `toSearchParams` comma-joins them; we split them back. */
const LIST_OPERATORS: ReadonlySet<FilterOperator> = new Set<FilterOperator>([
  'in',
  'nin',
  'between',
])

const NO_FILTERS: readonly FilterSpec[] = []

/** `?view=captains` + `urlKey: 'lf'` → `captains.lf`. Empty string means bare names. */
export function tableScope(search: string, urlKey: string): string {
  const view = new URLSearchParams(search).get('view')
  return [view, urlKey].filter((part): part is string => !!part && part !== '').join('.')
}

function scopedName(scope: string, name: string): string {
  return scope === '' ? name : `${scope}.${name}`
}

/**
 * `field:asc` → `{ field, dir }`. Anything else — including the empty value —
 * is **explicitly no sort**, which is what `clearSort()` writes.
 *
 * Split on the LAST colon: a field name has no colon, and being permissive at
 * the front costs nothing while being permissive at the back would accept
 * `name:desc:asc`.
 */
export function parseSortParam(raw: string): SortSpec | null {
  const value = raw.trim()
  if (value === '') return null
  const cut = value.lastIndexOf(':')
  if (cut <= 0) return null
  const field = value.slice(0, cut)
  const dir = value.slice(cut + 1)
  if (dir !== 'asc' && dir !== 'desc') return null
  return { field, dir }
}

/**
 * `field:op:value` → `FilterSpec`, or `null` for anything malformed (including
 * the empty value, which is the "explicitly no filters" marker).
 *
 * Split on the FIRST two colons only: a value legitimately contains them —
 * `slaDueAt:gte:2026-06-25T09:14:00+03:00` is an ordinary date filter.
 *
 * ### What the wire cannot carry, and why that is the right answer
 *
 * A query string has no type channel, so `52` and `"52"` are the same six bits
 * on the wire. Rather than guess, the type is recovered from the **operator**,
 * which is the only signal the format actually carries:
 *
 * | op | value |
 * |---|---|
 * | `isNull` · `isNotNull` | `null` — the operator *is* the predicate |
 * | `in` · `nin` · `between` | list of strings, comma-split |
 * | anything else | `true`/`false` become booleans; `''` becomes `null`; the rest stays a string |
 *
 * That covers every filter this product can actually produce: `lib/columnFilter.ts`
 * emits `contains`/`eq`/`in` with strings, `eq` with a boolean (its `boolean`
 * kind), and `gte`/`lte`/`between` with numbers or dates — and the mock engine
 * puts those three through `numeric()`, which parses a string. The one lossy
 * case left is a numeric `eq`, which no control emits, because `computeFacets`
 * hands every select option back as a string.
 */
export function parseFilterParam(raw: string): FilterSpec | null {
  const first = raw.indexOf(':')
  if (first <= 0) return null
  const second = raw.indexOf(':', first + 1)
  if (second < 0) return null
  const field = raw.slice(0, first)
  const op = raw.slice(first + 1, second) as FilterOperator
  if (!(op in FILTER_OPERATORS)) return null
  return { field, op, value: parseFilterValue(op, raw.slice(second + 1)) }
}

function parseFilterValue(op: FilterOperator, raw: string): FilterValue {
  if (op === 'isNull' || op === 'isNotNull') return null
  if (LIST_OPERATORS.has(op)) return raw === '' ? [] : raw.split(',')
  if (raw === 'true') return true
  if (raw === 'false') return false
  if (raw === '') return null
  return raw
}

/* Rendering. Every one of these delegates to `toSearchParams` — see the header. */

function renderQ(q: string): string | null {
  return toSearchParams({ q }).get(PARAM.q)
}

/** Page 1 is the default and is never written (`null` = absent). */
function renderPage(page: number): string | null {
  return page <= 1 ? null : toSearchParams({ page }).get(PARAM.page)
}

function renderSort(sort: SortSpec | null): string | null {
  return toSearchParams({ sort }).get(PARAM.sort)
}

function renderFilters(filters: readonly FilterSpec[]): string[] {
  return toSearchParams({ filters: [...filters] }).getAll(PARAM.filter)
}

/* ───────────────────────── read and write one URL ──────────────────────── */

/** The screen's declared starting point. Absent parameters read back as this. */
export interface TableDefaults {
  q: string
  sort: SortSpec | null
  filters: readonly FilterSpec[]
}

export interface TableUrlValues {
  q: string
  page: number
  sort: SortSpec | null
  filters: readonly FilterSpec[]
}

function clampPage(value: number): number {
  return Number.isFinite(value) ? Math.max(1, Math.trunc(value)) : 1
}

/**
 * `location.search` → the table's question. Never throws on a hand-typed URL:
 * an unparseable `sort` reads as unsorted and an unparseable `filter` chip is
 * dropped, because the alternative is a blank screen for a mistyped address.
 */
export function readTableParams(
  search: string,
  scope: string,
  defaults: TableDefaults,
): TableUrlValues {
  const sp = new URLSearchParams(search)

  const rawQ = sp.get(scopedName(scope, PARAM.q))
  const rawPage = sp.get(scopedName(scope, PARAM.page))
  const rawSort = sp.get(scopedName(scope, PARAM.sort))
  const rawFilters = sp.getAll(scopedName(scope, PARAM.filter))

  return {
    q: rawQ ?? defaults.q,
    page: rawPage === null ? 1 : clampPage(Number(rawPage)),
    sort: rawSort === null ? defaults.sort : parseSortParam(rawSort),
    filters:
      rawFilters.length === 0
        ? defaults.filters
        : rawFilters
            .map(parseFilterParam)
            .filter((spec): spec is FilterSpec => spec !== null),
  }
}

/**
 * The table's question → the next `location.search`, leaving every parameter
 * that is not ours exactly where it was — `?view=`, `?entity=` and the other
 * shell layers survive, because a table is not a navigation (**AC-10**).
 *
 * A value equal to the screen's default is **deleted**, not written: that is
 * "absent means default", enforced at the writer so no caller can leak a
 * default into a shared link. A value that is *none* where the default is
 * *something* is written as the empty parameter — see the header.
 */
export function writeTableParams(
  search: string,
  scope: string,
  value: TableUrlValues,
  defaults: TableDefaults,
): string {
  const sp = new URLSearchParams(search)

  setOrDelete(sp, scopedName(scope, PARAM.q), renderQ(value.q), renderQ(defaults.q))
  setOrDelete(sp, scopedName(scope, PARAM.page), renderPage(value.page), null)
  setOrDelete(sp, scopedName(scope, PARAM.sort), renderSort(value.sort), renderSort(defaults.sort))

  const filterName = scopedName(scope, PARAM.filter)
  const wanted = renderFilters(value.filters)
  sp.delete(filterName)
  /* Element-wise, not `join(sep)`: a filter value legitimately contains
     almost any character (`city:eq:Riyadh City`), so any separator that
     could turn up inside a value would call two different lists equal. */
  if (!sameList(wanted, renderFilters(defaults.filters))) {
    if (wanted.length === 0) sp.append(filterName, '')
    else for (const one of wanted) sp.append(filterName, one)
  }

  const next = sp.toString()
  return next === '' ? '' : `?${next}`
}

function sameList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

function setOrDelete(
  sp: URLSearchParams,
  name: string,
  value: string | null,
  fallback: string | null,
): void {
  if (value === fallback) sp.delete(name)
  else sp.set(name, value ?? '')
}

/* ──────────────────────────────── the hook ─────────────────────────────── */

export interface UseUrlTableStateOptions {
  /** `false` keeps every value in `useState`, exactly as before P1-T1. */
  urlState?: boolean
  /** Appended to the scope so two tables on one address do not share one query. */
  urlKey?: string
  initialQuery?: string
  initialView?: string | null
  initialFilters?: readonly FilterSpec[]
  initialSort?: SortSpec | null
  searchDebounceMs?: number
}

export interface UrlTableState {
  /** True when the address bar is the store. False = no router, or opted out. */
  isUrlBacked: boolean
  /** The live input value — repaints per keystroke. */
  query: string
  /** What the request should carry: the debounced query, or the one in the URL. */
  committedQuery: string
  view: string | null
  filters: readonly FilterSpec[]
  sort: SortSpec | null
  page: number
  isFiltered: boolean
  setQuery: (next: string) => void
  setView: (next: string | null) => void
  setFilter: (filter: FilterSpec) => void
  removeFilter: (field: string) => void
  clearAll: () => void
  setPage: (next: number) => void
  nextPage: () => void
  previousPage: () => void
  /**
   * Takes an updater, not a value, and for the same reason `setState` does:
   * `DataTable`'s sort menu calls `setSortField` and `setSortDirection` **in one
   * handler**, and the second must see what the first just did. A value-taking
   * setter reads a render-old `sort` and silently drops the direction — which
   * is `aria-sort="ascending"` on a column the operator asked to sort descending.
   */
  setSort: (update: (current: SortSpec | null) => SortSpec | null) => void
}

type HistoryMode = 'push' | 'replace'

/** A patch, or a function of the values as they stand *including* edits already made this tick. */
type Patch = Partial<TableUrlValues> | ((current: TableUrlValues) => Partial<TableUrlValues>)

export function useUrlTableState(options: UseUrlTableStateOptions = {}): UrlTableState {
  /* `useLocation`/`useNavigate` throw without a `<Router>`; the contexts they
     read default to `null`, which is the whole reason they are read directly. */
  const locationCtx = useContext(UNSAFE_LocationContext)
  const navigationCtx = useContext(UNSAFE_NavigationContext)
  const location = locationCtx?.location ?? null
  const navigator = navigationCtx?.navigator ?? null
  const basename = navigationCtx?.basename ?? '/'
  const search = location?.search ?? ''

  const isUrlBacked = options.urlState !== false && location !== null && navigator !== null

  /**
   * The `initial*` options are read **once**, exactly as `useState`'s
   * initialiser read them before. Screens declare them inline
   * (`initialSort: { field: 'name', dir: 'asc' }`), so they are a fresh object
   * on every render; putting them in a dependency array unmemoised would give
   * `params` a new identity per render and turn `useAsync` into a refetch loop.
   */
  const defaultsRef = useRef<TableDefaults | null>(null)
  if (defaultsRef.current === null) {
    defaultsRef.current = {
      q: options.initialQuery ?? '',
      sort: options.initialSort ?? null,
      filters: options.initialFilters ?? NO_FILTERS,
    }
  }
  const defaults = defaultsRef.current

  const urlKey = options.urlKey ?? ''
  const scope = useMemo(() => tableScope(search, urlKey), [search, urlKey])

  /* One parse per address. Its arrays keep their identity while the URL does,
     which is what keeps `table.params` stable between renders. */
  const fromUrl = useMemo(
    () => (isUrlBacked ? readTableParams(search, scope, defaults) : null),
    [isUrlBacked, search, scope, defaults],
  )

  /**
   * The fallback store, and — in both modes — the home of the live search input
   * and of `view`. `view` is not written to the URL: `?view=` has one writer
   * and it is `routeState.withView`.
   */
  const local = useFilters({
    initialQuery: fromUrl?.q ?? defaults.q,
    initialView: options.initialView ?? null,
    initialFilters: defaults.filters,
  })
  const [localPage, setLocalPage] = useState(1)
  const [localSort, setLocalSort] = useState<SortSpec | null>(defaults.sort)

  /* `local` is a fresh object whenever its state moves; its callbacks are not.
     Destructuring keeps every setter below as stable as the one it wraps. */
  const {
    setQuery: setDraft,
    setView: setLocalView,
    setFilter: setLocalFilter,
    removeFilter: removeLocalFilter,
    clearAll: clearLocalAll,
  } = local

  const draft = local.query
  const settled = useDebouncedValue(draft, options.searchDebounceMs ?? DEFAULT_DEBOUNCE_MS)

  const committedQuery = fromUrl ? fromUrl.q : settled
  const filters = fromUrl ? fromUrl.filters : local.filters
  const sort = fromUrl ? fromUrl.sort : localSort
  const page = fromUrl ? fromUrl.page : localPage

  /** The last `q` this hook put in the URL. Lets the effect below tell "the
      operator typed" from "the URL moved underneath us" — Back, or a link. */
  const publishedRef = useRef(fromUrl?.q ?? defaults.q)

  /** See `commit`. Cleared as soon as the render catches up with the address. */
  const pendingSearchRef = useRef<string | null>(null)
  const seenSearchRef = useRef(search)
  if (seenSearchRef.current !== search) {
    seenSearchRef.current = search
    pendingSearchRef.current = null
  }

  /**
   * ### push vs replace
   *
   * **`push` for a committed search and for `Clear all`. `replace` for a
   * filter, a sort or a page.**
   *
   * A typed query is a question the operator asked, and Back must undo it —
   * the same argument `ReportBuilder` makes for pushing on `Run` and not on
   * every keystroke (**AC-854**). `Clear all` is as deliberate as typing, and
   * an accidental one has to be recoverable.
   *
   * A filter chip, a caret and a page button are *refinements of the question
   * already asked*. Pushing them would make Back a twelve-step undo of chip
   * tweaks, so the operator could never get **out** of the list — which is the
   * failure this task exists to remove, not one to reintroduce at a finer
   * grain. Replacing means Back leaves the list.
   *
   * Either way the address is complete at every instant, so opening a record
   * and pressing Back returns to the filtered, sorted, page-3 list. That does
   * not depend on which mode was used; only on the URL being the store.
   */
  const commit = useCallback(
    (patch: Patch, mode: HistoryMode) => {
      if (!isUrlBacked || location === null || navigator === null) return
      /**
       * React batches the re-render, so a second `commit` in the same handler
       * would otherwise read the search string as it was *before* the first one
       * and overwrite it. `pendingSearchRef` is what the URL already is, as
       * against what this render was told it is; it is dropped the moment the
       * router catches up (or moves somewhere we did not send it).
       */
      const currentSearch = pendingSearchRef.current ?? location.search
      const currentScope = tableScope(currentSearch, urlKey)
      const current = readTableParams(currentSearch, currentScope, defaults)
      const resolved = typeof patch === 'function' ? patch(current) : patch
      const next: TableUrlValues = { ...current, ...resolved }
      if (resolved.q !== undefined) publishedRef.current = resolved.q

      const nextSearch = writeTableParams(currentSearch, currentScope, next, defaults)
      /* A navigation that changes nothing still costs a history entry. */
      if (nextSearch === currentSearch) return
      pendingSearchRef.current = nextSearch

      const to = {
        pathname: joinBasename(basename, location.pathname),
        search: nextSearch,
        hash: location.hash,
      }
      if (mode === 'push') navigator.push(to)
      else navigator.replace(to)
    },
    [isUrlBacked, location, navigator, basename, urlKey, defaults],
  )

  /**
   * The two directions the search field and `?q=` move in.
   *
   * **Out:** only when the debounce has settled *on the current draft* — one
   * history entry per query the operator actually asked, never one per
   * keystroke. That single condition is also what stops Back from being undone
   * by an in-flight debounce: right after a Back the draft has already been
   * reset to the URL's value while `settled` still trails the old one, so
   * `settled === draft` is false and nothing is written back.
   *
   * **In:** when `?q=` moved without us — Back, Forward, or a pasted link — the
   * input adopts it, so the box and the address never disagree.
   */
  useEffect(() => {
    if (fromUrl === null) return
    if (fromUrl.q !== publishedRef.current) {
      publishedRef.current = fromUrl.q
      setDraft(fromUrl.q)
      return
    }
    if (settled === draft && settled !== fromUrl.q) {
      commit({ q: settled, page: 1 }, 'push')
    }
  }, [fromUrl, settled, draft, setDraft, commit])

  const setQuery = useCallback(
    (next: string) => {
      /* The input repaints now; the URL waits for the debounce. */
      setDraft(next)
      if (!isUrlBacked) setLocalPage(1)
    },
    [setDraft, isUrlBacked],
  )

  const setView = useCallback(
    (next: string | null) => {
      setLocalView(next)
      if (isUrlBacked) commit({ page: 1 }, 'replace')
      else setLocalPage(1)
    },
    [setLocalView, isUrlBacked, commit],
  )

  /* Updater form throughout: `DataTable` commits more than one filter in a
     single handler, and each must see the one before it. */
  const setFilter = useCallback(
    (filter: FilterSpec) => {
      if (isUrlBacked) {
        commit((now) => ({ filters: withFilter(now.filters, filter), page: 1 }), 'replace')
      } else {
        setLocalFilter(filter)
        setLocalPage(1)
      }
    },
    [isUrlBacked, commit, setLocalFilter],
  )

  const removeFilter = useCallback(
    (field: string) => {
      if (isUrlBacked) {
        commit((now) => ({ filters: withoutFilter(now.filters, field), page: 1 }), 'replace')
      } else {
        removeLocalFilter(field)
        setLocalPage(1)
      }
    },
    [isUrlBacked, commit, removeLocalFilter],
  )

  const clearAll = useCallback(() => {
    /* §9.1: `Clear all` drops every chip and the query, and leaves the view —
       a view is not a filter. */
    setDraft('')
    if (isUrlBacked) commit({ q: '', filters: NO_FILTERS, page: 1 }, 'push')
    else {
      clearLocalAll()
      setLocalPage(1)
    }
  }, [setDraft, clearLocalAll, isUrlBacked, commit])

  const movePage = useCallback(
    (update: (current: number) => number) => {
      if (isUrlBacked) commit((now) => ({ page: clampPage(update(now.page)) }), 'replace')
      else setLocalPage((current) => clampPage(update(current)))
    },
    [isUrlBacked, commit],
  )

  const setPage = useCallback((next: number) => movePage(() => next), [movePage])
  const nextPage = useCallback(() => movePage((current) => current + 1), [movePage])
  const previousPage = useCallback(() => movePage((current) => current - 1), [movePage])

  const setSort = useCallback(
    (update: (current: SortSpec | null) => SortSpec | null) => {
      if (isUrlBacked) commit((now) => ({ sort: update(now.sort), page: 1 }), 'replace')
      else {
        setLocalSort(update)
        setLocalPage(1)
      }
    },
    [isUrlBacked, commit],
  )

  return {
    isUrlBacked,
    query: draft,
    committedQuery,
    view: local.view,
    filters,
    sort,
    page,
    /* Reads the DRAFT, not the committed value: `Clear all` appears the moment
       there is something to clear, not 250 ms later. */
    isFiltered: hasActiveFilters(draft, filters),
    setQuery,
    setView,
    setFilter,
    removeFilter,
    clearAll,
    setPage,
    nextPage,
    previousPage,
    setSort,
  }
}

/**
 * `location.pathname` from the router context has the basename stripped;
 * `navigator.push` wants it back. `useNavigate` does the same join — this is
 * that one line, not a policy.
 */
function joinBasename(basename: string, pathname: string): string {
  if (!basename || basename === '/') return pathname
  return `${basename.replace(/\/+$/, '')}${pathname}`
}
