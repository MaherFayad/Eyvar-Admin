/**
 * `GlobalSearch` (S-05) — design spec §5, spec §4.3.4.
 *
 * §4.3.4 is explicit that this is **part of the shell contract, not a
 * convenience**: four settings panes changed workspace and seven merges moved
 * familiar pages, and search is what makes that survivable. If someone cannot
 * find Cancellation Policy, search takes them to Financials › Pricing & Plans
 * without them needing to know it moved.
 *
 * Rules applied
 *   §2.6 / §5   an **anchored popover on the field**, 480px, expanding IN
 *               PLACE. Never a centred command palette — §2.6 forbids
 *               relocating it, and the reference
 *               (`14-global-search/search-modal-order-results-list.webp`) is an
 *               anchored popover.
 *   §5          the field is 400px, 28px tall, centred on the viewport, with a
 *               leading magnifier and a trailing `⌘ K` / `Ctrl K` keycap.
 *   §5          the scope is a **removable chip INSIDE the input**, followed by
 *               the query. Never a separate dropdown outside the field.
 *               `Backspace` on an empty query removes it.
 *   §5          sections in FIXED order — **Destinations · Records · Actions**,
 *               each labelled with a count. Destinations first, because §4.3.4's
 *               stated job is finding where a page moved.
 *   §5          a destination's second line is its PATH, separated by `·`, not
 *               `›` — it is result metadata, not a breadcrumb, and using `·`
 *               makes it impossible to mistake for the top-bar pair. §2.6's ban
 *               on breadcrumbs is untouched.
 *   §5 / AC-30  legacy names resolve through the route table's `legacyPageIds`,
 *               so `Renewal pipeline` returns *Operations › Subscriptions —
 *               Expiring ≤ 7 days*.
 *   §5 / R8     scoped with no query → one centred PROMPT, never a "no
 *               results" error. Query with no matches → one grey sentence plus
 *               the escape hatch.
 *   §5          the ESCAPE HATCH is **always the last row**.
 *   AC-60       results the role cannot open never appear. The filtering is the
 *               server's — the client does not hold the permission truth — and
 *               the client does not re-add any.
 *   §5          keyboard: `⌘K`/`Ctrl K` opens and focuses · `↑ ↓` move across
 *               section boundaries · `Enter` opens · `Backspace` on an empty
 *               query removes the chip · `Escape` closes and returns focus to
 *               the field. `cmdk` owns the arrow keys, so `useRovingFocus` is
 *               NOT used here.
 *   §14         the chip's POSITION mirrors; the `⌘ K` glyph order does not.
 *               The magnifier does not mirror.
 *   R-3 §1.3    tier 2, through `PopoverContent`.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Kbd } from '@/components/ui/kbd'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useAsync, useDebouncedValue } from '@/hooks'
import { search as searchClient } from '@/data/clients'
import type { SearchResponse, SearchResult } from '@/data/types'
import type { Translate } from '@/lib'

export interface GlobalSearchProps {
  t: Translate
  /** Opening the 360° profile layer for an entity hit (§6.2). */
  onOpenEntity: (entityId: string) => void
}

export function GlobalSearch({ t, onOpenEntity }: GlobalSearchProps) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  /** The removable chip INSIDE the input. `null` is unscoped. */
  const [scope, setScope] = useState<string | null>(null)

  const debounced = useDebouncedValue(query)

  /* §5 — `⌘K` / `Ctrl K` from anywhere opens and focuses. One listener, on the
     document, owned by the shell. */
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== 'k') return
      if (!event.metaKey && !event.ctrlKey) return
      event.preventDefault()
      setOpen(true)
      inputRef.current?.focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const results = useAsync<SearchResponse>(
    (signal) => searchClient(debounced, { scope }, signal),
    { deps: [debounced, scope], enabled: open && debounced.trim() !== '' },
  )

  const close = useCallback(() => {
    setOpen(false)
    inputRef.current?.focus()
  }, [])

  const activate = useCallback(
    (result: SearchResult) => {
      close()
      if ('entityId' in result.target) {
        onOpenEntity(result.target.entityId)
        return
      }
      const suffix = result.target.viewId ? `?view=${encodeURIComponent(result.target.viewId)}` : ''
      navigate(`${result.target.path}${suffix}`)
    },
    [close, navigate, onOpenEntity],
  )

  const all = results.data?.results ?? []
  const destinations = all.filter((r) => r.kind === 'destination')
  const records = all.filter((r) => r.kind === 'entity')
  const actions = all.filter((r) => r.kind === 'action')
  const hasQuery = query.trim() !== ''

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {/* PopoverAnchor, not PopoverTrigger: the field is the anchor AND stays
          the focused element. A trigger would steal focus back from the input
          on every open. */}
      <PopoverAnchor asChild>
        <div
          className={cn(
            'flex h-control w-100 items-center gap-1.5 rounded-lg border border-input bg-card px-2',
            'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background',
          )}
        >
          {/* §9.5 — a magnifier is an object; it does not mirror. */}
          <MagnifierGlyph />

          {/* §2.6 / §5 — the scope chip lives INSIDE the input box, before the
              query. Its POSITION mirrors because the box is a logical flex row;
              nothing about it is physically placed. */}
          {scope && (
            <button
              type="button"
              onClick={() => setScope(null)}
              aria-label={t('shell.search.removeScope', { scope })}
              className="inline-flex h-5 shrink-0 items-center gap-1 rounded-lg bg-neutral px-1.5 text-2xs font-semibold text-neutral-foreground outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            >
              {scope}
              <span aria-hidden="true">✕</span>
            </button>
          )}

          <input
            ref={inputRef}
            type="search"
            value={query}
            placeholder={t('shell.search.placeholder')}
            aria-label={t('shell.topbar.search')}
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value)
              setOpen(true)
            }}
            onKeyDown={(event) => {
              /* §5 — `Backspace` on an EMPTY query removes the scope chip. */
              if (event.key === 'Backspace' && query === '' && scope !== null) {
                event.preventDefault()
                setScope(null)
              }
              if (event.key === 'Escape') close()
            }}
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-hidden placeholder:text-muted-foreground"
          />

          {/* §14 — the chip's position mirrors with the row; the glyph ORDER
              inside it does not, which is why `⌘ K` is one string in one key. */}
          <Kbd className="shrink-0">{t('shell.topbar.searchShortcut')}</Kbd>
        </div>
      </PopoverAnchor>

      <PopoverContent
        align="start"
        className="w-120 gap-0 p-0"
        /* §7.3.3 — a popover does not trap. Focus stays in the field so the
           operator keeps typing; ↑ ↓ drive the list from there. */
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <Command shouldFilter={false} loop>
          <CommandList className="max-h-100">
            {/* §5 — scoped with NO query is a PROMPT, never a "no results"
                error. Unscoped with no query gets the general prompt. */}
            {!hasQuery && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                {scope ? t('shell.search.scopedPrompt', { scope }) : t('shell.search.prompt')}
              </p>
            )}

            {hasQuery && results.status === 'loading' && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                {t('shell.search.prompt')}
              </p>
            )}

            {/* R8 `no-match` — ONE grey sentence. No illustration, no heading. */}
            {hasQuery && results.status !== 'loading' && all.length === 0 && (
              <CommandEmpty className="px-3 py-6 text-center text-sm text-muted-foreground">
                {t('shell.search.noMatch', { query })}
              </CommandEmpty>
            )}

            {/* §5 — FIXED order: Destinations · Records · Actions. */}
            <ResultGroup
              heading={t('shell.search.destinations', { count: destinations.length })}
              results={destinations}
              onActivate={activate}
              t={t}
            />
            <ResultGroup
              heading={t('shell.search.records', { count: records.length })}
              results={records}
              onActivate={activate}
              t={t}
            />
            <ResultGroup
              heading={t('shell.search.actions', { count: actions.length })}
              results={actions}
              onActivate={activate}
              t={t}
            />

            {/* §5 — the escape hatch is ALWAYS the last row, present whether or
                not anything matched. */}
            {hasQuery && (
              <CommandGroup>
                <CommandItem
                  value="__escape-hatch__"
                  onSelect={() => {
                    close()
                    navigate(scope ? `/operations/overview?q=${encodeURIComponent(query)}` : '/operations/overview')
                  }}
                >
                  <MagnifierGlyph />
                  <span>
                    {scope
                      ? t('shell.search.escapeHatch', { query, scope })
                      : t('shell.search.escapeHatchUnscoped', { query })}
                  </span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

/**
 * **AC-74 — a search result must never render a raw i18n key.** The 0.8 QA
 * verdict found `subtab.operations.overview` rendering as a visible result
 * title, and it was right.
 *
 * The root cause is in the data layer, not here: `searchDestinations` in
 * `src/data/clients/profile.ts` sets `title: row.titleKey`, and
 * `SearchResult.title` is typed as a finished display string. **The real fix is
 * a `titleKey` field on `SearchResult`** so a destination carries a key and an
 * entity carries a name, and neither has to be guessed. `src/data` has a single
 * owner and it is not me; raised to mock-data-engineer in `02-shell-fixes.md`.
 *
 * Until that lands the shell defends itself, because rendering a key to an
 * operator is worse than a guard. The guard is deliberately narrow: a dotted,
 * space-free, lower-camel token is an i18n key and nothing an operator is
 * called. `Nora Al-Harbi`, `TRP-4182` and `Riyadh North` all fail it, so a
 * human string is never put through `t()` — which matters, because `t()`
 * THROWS on a missing key in dev and under test.
 */
const LOOKS_LIKE_I18N_KEY = /^[a-z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9]+)+$/

function displayString(value: string, t: Translate): string {
  return LOOKS_LIKE_I18N_KEY.test(value) ? t(value) : value
}

/** One labelled section. Renders nothing when empty — a `Records (0)` heading is noise. */
function ResultGroup({
  heading,
  results,
  onActivate,
  t,
}: {
  heading: string
  results: SearchResult[]
  onActivate: (result: SearchResult) => void
  t: Translate
}) {
  if (results.length === 0) return null
  return (
    <CommandGroup heading={heading}>
      {results.map((result) => {
        const title = displayString(result.title, t)
        const subtitle = result.subtitle ? displayString(result.subtitle, t) : null
        return (
          <CommandItem
            key={`${result.kind}:${result.title}:${result.subtitle ?? ''}`}
            /* `value` is what `cmdk` filters and matches on, so it takes the
               DISPLAY string: an operator typing `Overview` must match the row
               that says `Overview`, not the key behind it. */
            value={`${result.kind}:${title}:${subtitle ?? ''}`}
            onSelect={() => onActivate(result)}
            className="flex-col items-start gap-0"
          >
            <span className="text-sm text-foreground">{title}</span>
            {/* §5 — result METADATA, `·` separated. Not a breadcrumb (§2.6). */}
            {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
          </CommandItem>
        )
      })}
    </CommandGroup>
  )
}

/** §9.5 — the magnifier does not mirror. */
function MagnifierGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="size-4 shrink-0 text-muted-foreground"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  )
}
