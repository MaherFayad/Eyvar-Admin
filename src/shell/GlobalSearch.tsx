/**
 * `GlobalSearch` (S-05) — design spec §5, spec §4.3.4, **D9 /
 * `design/05-command-centre.md`**.
 *
 * ## What this file became
 *
 * It was a search box. **It is now the command centre's field**, and the
 * difference is the owner's own sentence: *"command K should open a command
 * center … so there is really rich context menu, not just search but making
 * actions also."*
 *
 * The mechanics of §5 survive verbatim — the anchored popover, the 400px field,
 * the chip inside the input, the two-line row, the escape hatch, the
 * legacy-name resolution, the four states. What changed is that the surface can
 * now **execute**, is **populated before a key is pressed**, and can descend
 * into a target and a confirmation without leaving the field.
 *
 * The split of responsibility is deliberate and is the reason this file is
 * shorter than it was:
 *
 *   - **this file** owns the FIELD and the POPOVER — §2.6's anchoring, ⌘K, the
 *     magnifier, the keycap, the escape hatch's destination, and handing the
 *     model what only a routed component knows;
 *   - **`@/commands/usePalette`** owns every decision about rows, order,
 *     refusals and transitions;
 *   - **`@/components/command`** owns the pixels.
 *
 * Rules applied
 *   §2.6 / §5   an **anchored popover on the field**, expanding IN PLACE. Never
 *               a centred command palette — **CQ-1** re-affirmed this *after*
 *               the confirm step was designed: §2.6's reason (never relocate
 *               the thing the operator aimed at) is unchanged by the surface
 *               growing, so the list is capped at 8 rows with an internal
 *               scroll and the confirm step REPLACES the list.
 *   §5          the field is 400px, 28px tall, centred on the viewport, with a
 *               leading magnifier and a trailing `⌘ K` / `Ctrl K` keycap.
 *   §5          the scope is a **removable chip INSIDE the input**, followed by
 *               the query. The palette's command and target chips take the same
 *               position and the same shape, because they are the same idea:
 *               something committed, still visible, still removable.
 *   §5 / §3     `Backspace` on an EMPTY query removes the last chip — which is
 *               now how the palette ascends. **`Escape` ascends from
 *               target/confirm and closes only from root** (§6). Two meanings
 *               for one key is a real cost; the alternative throws away a typed
 *               target, which is worse.
 *   §5 / CQ-2   section order is derived from the query's shape. A leading verb
 *               puts `Do` first; everything else keeps §5's
 *               `Destinations · Records`.
 *   §5 / AC-30  legacy names resolve through the route table's `legacyPageIds`.
 *   §5 / R8     nothing typed → the four context blocks, or a PROMPT when there
 *               is nothing to offer. Never a "no results" error.
 *   §11.3       loading is a **skeleton shaped like the result rows**.
 *   §11.2/AC-39 a **failed read is its own state**, with a retry.
 *   AC-60/CQ-3  destinations and records the role cannot open never appear —
 *               the server filters and the client does not re-add any. An
 *               **action** the role cannot use is the opposite: §11.2, present
 *               and disabled with its reason.
 *   §14         the chips' POSITION mirrors; the `⌘ K` glyph order does not.
 *               The magnifier does not mirror.
 *   R-3 §1.3    tier 2, through `PopoverContent`.
 *
 * ## The three defects closed here in 0.9 are still closed
 *
 * **1.** A failed search said "no matches". They are opposite instructions and
 * are two states; the model keeps them apart, and a failed search that still
 * has matching *commands* now renders the error line **above** them rather than
 * instead of the whole list — the `Do` section is local and still answers.
 *
 * **2.** The escape hatch dropped the query on a metric board. It still goes to
 * an index route, which is the only kind that reads `?q=`.
 *
 * **3. The `Actions` group was removed rather than left dead — and this is the
 * commit that earns it back.** The reason it was removed was exact: every
 * command is `scope: entity` with `arity: 'needs-target'`, so a row rendered
 * before the target-collection step existed could not run, and a row that
 * cannot run is a §11.2 breach in a new place. The target step (P3-T6) is that
 * step. The group is back, it executes, and it is called `Do`.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Command, CommandGroup, CommandItem } from '@/components/ui/command'
import { Kbd } from '@/components/ui/kbd'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { CommandPalette, PaletteChips } from '@/components/command/CommandPalette'
import { commandSession, usePalette } from '@/commands'
import { cn } from '@/lib/utils'
import { useAsync, useLanguage } from '@/hooks'
import { resolveProfile } from '@/data/clients'
import type { ProfileEntityType, ProfileRef } from '@/data/types'
import type { Translate } from '@/lib'
import { useShell } from './ShellContext'
import { useRouteState } from './routeState'

export interface GlobalSearchProps {
  t: Translate
  /** Opening the 360° profile layer for an entity hit (§6.2). */
  onOpenEntity: (entityId: string) => void
}

/**
 * Where the escape hatch goes when nothing is scoped.
 *
 * **An index route, because an index route is what reads `?q=`.** Every one of
 * them runs `useIndexTable` → `useUrlTableState`, which takes the query off the
 * URL, so the operator arrives with their words already in the search box.
 * `/operations/overview` is a metric board and reads nothing, which is what
 * made the old row a dead end.
 *
 * People is the choice because it is the product's primary record index and the
 * only collection legacy's own name search covered (`09b` §17.1). It is not a
 * permanent answer: the right one is per-scope, and it belongs in the route
 * table beside the scope chip that does not exist yet.
 */
const ESCAPE_HATCH_PATH = '/operations/people'

export function GlobalSearch({ t, onOpenEntity }: GlobalSearchProps) {
  const navigate = useNavigate()
  const shell = useShell()
  const route = useRouteState()
  const { language } = useLanguage()
  const inputRef = useRef<HTMLInputElement>(null)
  /**
   * The field, so the popover can tell that a click on it is **not** an outside
   * interaction.
   *
   * §2.6 puts the anchor in the top bar and the content in a portal, so as far
   * as Radix is concerned the field the popover belongs to is outside it: a
   * `pointerdown` on the input dismissed the palette. It was invisible while the
   * only interaction was typing — focus re-opened it on the same gesture — and
   * surfaced the moment the palette grew rows worth clicking, because clicking a
   * row moves focus off the input and clicking back in then closes the surface
   * the operator is in the middle of using. **They are one control, and this is
   * what says so.**
   */
  const anchorRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  /** The removable chip INSIDE the input. `null` is unscoped. §5, unchanged. */
  const [scope, setScope] = useState<string | null>(null)

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

  const close = useCallback(() => {
    setOpen(false)
    inputRef.current?.focus()
  }, [])

  /**
   * **P3-T7's second pre-seed source: the open 360° profile.**
   *
   * The URL carries the entity's **id** and not its type (`?entity=DRV-0204`),
   * and the palette needs the type to know which registry applies. One resolve,
   * only while a layer is open, and a failure simply means no pre-seed — an
   * unresolvable overlay is the profile layer's own error to state, not the
   * palette's.
   */
  const overlayEntityId = route.overlay === 'entity' ? route.overlayValue : null
  const profile = useAsync<ProfileRef>((signal) => resolveProfile(overlayEntityId ?? '', signal), {
    deps: [overlayEntityId],
    enabled: overlayEntityId !== null,
  })

  /**
   * **CQ-7 / Q4** — one boolean, built in one place, read only by
   * `roleRefusal`. When D17's twenty keys land, this call changes and no domain
   * registry does.
   *
   * Memoised because it is the seed of `CommandContext`, which is the seed of
   * every refusal predicate and every row: a fresh object here would rebuild
   * the whole list on every keystroke and hand `cmdk` a new item identity each
   * time, which resets its active row mid-typing.
   */
  const session = useMemo(
    () => commandSession(shell.permissions.permissions),
    [shell.permissions.permissions],
  )

  /* The layer takes an id: `?entity=` is an overlay param on the current route
     (AC-21, AC-22), and the type is resolved on the way in. Stable for the same
     reason as `session`. */
  const openProfile = useCallback(
    (_entityType: ProfileEntityType, entityId: string) => onOpenEntity(entityId),
    [onOpenEntity],
  )

  const palette = usePalette({
    open,
    close,
    t,
    language,
    session,
    subTabId: route.subTabId,
    openEntityId: overlayEntityId,
    openEntityType: profile.data?.entityType ?? null,
    /* §8.4 — the same counts the rail badges read. One read at the shell, two
       surfaces, so a queue's number cannot differ between them. */
    navCounts: shell.navCounts,
    navigate,
    openProfile,
  })

  const hasQuery = palette.query.trim() !== ''

  return (
    /**
     * **`Command` wraps the Popover, and that placement is load-bearing.**
     *
     * `cmdk` attaches its arrow-key handler to `[cmdk-root]` and collects items
     * from `[cmdk-list-sizer]`. The list is inside the popover — portalled —
     * and the **input is not**: §2.6 requires the field to stay in the top bar.
     * With the root inside the popover, the field's `keydown` never reached
     * `cmdk` at all, so `↑ ↓` and `Enter` did nothing and the palette was
     * mouse-only. §5 has asked for those three keys since it was written.
     *
     * Wrapping instead makes the input a real DOM descendant of the root, so
     * the keys bubble to `cmdk`'s own handler with nothing synthesised. Item
     * collection is unaffected because it is scoped to the **list**, which is
     * where it always was. `display: contents` is what keeps the extra element
     * from becoming a box in the top bar's flex row.
     */
    <Command className="contents" shouldFilter={false} loop>
      <Popover open={open} onOpenChange={setOpen}>
        {/* PopoverAnchor, not PopoverTrigger: the field is the anchor AND stays
          the focused element. A trigger would steal focus back from the input
          on every open. */}
        <PopoverAnchor asChild>
          <div
            ref={anchorRef}
            className={cn(
              'flex h-control w-100 items-center gap-1.5 rounded-lg border border-input bg-card px-2',
              'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background',
            )}
          >
            {/* §9.5 — a magnifier is an object; it does not mirror. */}
            <MagnifierGlyph />

            {/* §2.6 / §5 — chips live INSIDE the input box, before the query.
              Their POSITION mirrors because the box is a logical flex row;
              nothing about them is physically placed. */}
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
            {/* §3 — one chip per committed step: `[Suspend captain] [2 captains]`. */}
            <PaletteChips chips={palette.chips} />

            <input
              ref={inputRef}
              type="search"
              value={palette.query}
              placeholder={palette.placeholder}
              aria-label={t('shell.topbar.search')}
              /* While a write is in flight the field is READ-ONLY, never
               disabled: the operator must still be able to read and select what
               they typed, and a disabled input drops out of the tab order
               mid-task. Same rule as the freeze contract, same reason. */
              readOnly={palette.busy}
              onFocus={() => setOpen(true)}
              onChange={(event) => {
                palette.setQuery(event.target.value)
                setOpen(true)
              }}
              onKeyDown={(event) => {
                /* §5 — `Backspace` on an EMPTY query removes the scope chip. The
                 palette's own chips are ascended past first, so the scope chip
                 is reached last, which is the order they were added in. */
                if (palette.handleKeyDown(event)) return
                if (event.key === 'Backspace' && palette.query === '' && scope !== null) {
                  event.preventDefault()
                  setScope(null)
                  return
                }
                /* Only from the ROOT state, and only once the palette has
                 declined the key. */
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
          /* `p-1` because the `cmdk` root that used to supply it now sits outside
           the popover; the inner spacing is unchanged. */
          className="w-120 gap-0 p-1"
          aria-label={t('command.palette.label')}
          /* §7.3.3 — a popover does not trap. Focus stays in the field so the
           operator keeps typing; ↑ ↓ drive the list from there. The confirm
           step's reason textarea takes focus itself, because that is the one
           state where the thing being typed is not the query. */
          onOpenAutoFocus={(event) => event.preventDefault()}
          /* **The field is not "outside" the popover, and Radix has no way to
             know that.** §2.6 puts the anchor in the top bar and the content in
             a portal, so a `pointerdown` or a focus landing on the input reads
             to `DismissableLayer` as an interaction outside the layer, and it
             dismisses. It was invisible while the only interaction was typing —
             the input's own `focus` re-opened the popover on the same gesture —
             and it surfaced the moment the palette grew rows worth clicking: a
             row click moves focus off the input, and clicking or tabbing back in
             then closed the surface the operator was halfway through using,
             taking the committed command with it. They are one control; this is
             the line that says so. */
          onInteractOutside={(event) => {
            if (anchorRef.current?.contains(event.target as Node)) event.preventDefault()
          }}
          onFocusOutside={(event) => {
            if (anchorRef.current?.contains(event.target as Node)) event.preventDefault()
          }}
        >
          <CommandPalette
            palette={palette}
            t={t}
            escapeHatch={
              /* §5 — ALWAYS the last row while there is a query, present
                 whether or not anything matched, and it carries the query to a
                 screen that reads it. Not offered mid-chain: a target step is
                 not a search, and a `Search for "nora"` row there would leave
                 the operator's half-composed command behind. */
              hasQuery && palette.step === 'root' ? (
                <CommandGroup>
                  <CommandItem
                    value="__escape-hatch__"
                    onSelect={() => {
                      close()
                      navigate(`${ESCAPE_HATCH_PATH}?q=${encodeURIComponent(palette.query)}`)
                    }}
                  >
                    <MagnifierGlyph />
                    <span>
                      {scope
                        ? t('shell.search.escapeHatch', {
                            query: palette.query,
                            scope,
                          })
                        : t('shell.search.escapeHatchUnscoped', {
                            query: palette.query,
                          })}
                    </span>
                  </CommandItem>
                </CommandGroup>
              ) : null
            }
          />
        </PopoverContent>
      </Popover>
    </Command>
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
