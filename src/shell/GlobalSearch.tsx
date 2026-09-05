/**
 * `GlobalSearch` (S-05) — the command centre's DOORS and its dialog.
 *
 * It was a search box, then an anchored palette. **It is now a centred modal**,
 * on the owner's override of 2026-09-05 (`docs/RULINGS.md`), and the top-bar
 * control is a 240px trigger rather than a field. The split is unchanged:
 *
 *   - **this file** owns the trigger, the three doors, the dialog and the keys
 *     the model does not claim;
 *   - **`@/commands/usePalette`** owns rows, order, refusals and transitions;
 *   - **`@/components/command`** owns the pixels.
 *
 * Rules applied
 *   override    a CENTRED MODAL over the Dialog scrim, 640 wide with its top
 *               edge at 16vh. This supersedes §2.6 and CQ-1 for this surface;
 *               R4-3 is untouched, because the palette is a modal like
 *               re-authentication and never writes the URL.
 *   §5 / §3     the query and the committed chips live in the palette's input
 *               row. `Backspace` on an empty query ascends, `Escape` ascends
 *               from a chip and closes at root, `Enter` runs or descends.
 *   §5 / AC-30  legacy names resolve through the route table's `legacyPageIds`.
 *   §5          the escape hatch is ALWAYS last while a query is present.
 *   §7.3.3      a modal HAS a scrim, so it OWNS THE KEYBOARD and DOES trap
 *               focus. Closing returns focus to the opener (AC-CP10).
 *   §14         the chips' position mirrors; the `⌘ K` glyph order does not,
 *               and the magnifier does not mirror.
 *   §13.2 / Q-P8 three doors: `⌘K` / `Ctrl K`, the trigger, and `/` when focus
 *               is not in a typing target.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Command, CommandDialog, CommandGroup, CommandItem } from '@/components/ui/command'
import { Kbd } from '@/components/ui/kbd'
import {
  CommandPalette,
  MagnifierGlyph,
  PaletteFooter,
  PaletteInputRow,
} from '@/components/command/CommandPalette'
import { commandSession, usePalette } from '@/commands'
import { isTypingTarget } from '@/commands/shortcuts'
import { useAsync, useLanguage } from '@/hooks'
import { resolveProfile } from '@/data/clients'
import type { ProfileEntityType, ProfileRef } from '@/data/types'
import type { Translate } from '@/lib'
import { useShell } from './ShellContext'
import { useRouteState } from './routeState'
import { track } from '@/lib/analytics'

export interface GlobalSearchProps {
  t: Translate
  /** Opening the 360° profile layer for an entity hit (§6.2). */
  onOpenEntity: (entityId: string) => void
  /** Opening the getting-started checklist (plan D-2). */
  onOpenOnboarding: () => void
}

/**
 * Where the escape hatch goes when nothing is scoped: an **index route**,
 * because an index route is what reads `?q=`. People is the product's primary
 * record index and the only collection legacy's own name search covered
 * (`09b` §17.1). The right answer is per-scope and belongs in the route table.
 */
const ESCAPE_HATCH_PATH = '/operations/people'

/** §14 — the chip names the key the operator actually has. */
function isApplePlatform(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

export function GlobalSearch({ t, onOpenEntity, onOpenOnboarding }: GlobalSearchProps) {
  const navigate = useNavigate()
  const shell = useShell()
  const route = useRouteState()
  const { language } = useLanguage()
  const inputRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  /** The removable chip INSIDE the input row. `null` is unscoped. §5. */
  const [scope, setScope] = useState<string | null>(null)
  /** `cmdk`'s active row, controlled so `Tab` and `→` can move it. */
  const [active, setActive] = useState('')

  /**
   * Opening with nothing focused would hand Radix `document.body` as the node
   * to restore to. Focusing the trigger first makes AC-CP10 true for every
   * door without the dialog having to guess who opened it.
   */
  const openPalette = useCallback((source: 'shortcut' | 'trigger' | 'slash') => {
    if (source !== 'trigger') triggerRef.current?.focus()
    track('palette.opened', { source })
    setOpen(true)
  }, [])

  /* §5 / Q-P8 — the two keyboard doors, on one document listener owned by the
     shell. `/` yields to every field in the product (`isTypingTarget`). */
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        openPalette('shortcut')
        return
      }
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return
      if (isTypingTarget(event.target)) return
      event.preventDefault()
      openPalette('slash')
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [openPalette])

  const close = useCallback(() => setOpen(false), [])

  /**
   * **The second pre-seed source: the open 360° profile.** The URL carries the
   * entity's id and not its type (`?entity=DRV-0204`), and the palette needs
   * the type to know which registry applies. A failure means no pre-seed.
   */
  const overlayEntityId = route.overlay === 'entity' ? route.overlayValue : null
  const profile = useAsync<ProfileRef>((signal) => resolveProfile(overlayEntityId ?? '', signal), {
    deps: [overlayEntityId],
    /* Keyed identically to `ProfileLayer` and `EntityPageScreen`, on purpose:
       opening the layer and then the palette resolves the same ref once. */
    cacheKey: 'profile.resolve',
    enabled: overlayEntityId !== null,
  })

  /**
   * **CQ-7 / Q4** — one boolean, built in one place. Memoised because it is the
   * seed of `CommandContext`: a fresh object would rebuild every row on every
   * keystroke and reset `cmdk`'s active row mid-typing.
   */
  const session = useMemo(
    () => commandSession(shell.permissions.permissions),
    [shell.permissions.permissions],
  )

  /* The layer takes an id: `?entity=` is an overlay param on the current route
     (AC-21, AC-22), and the type is resolved on the way in. */
  const openProfile = useCallback(
    (_entityType: ProfileEntityType, entityId: string) => onOpenEntity(entityId),
    [onOpenEntity],
  )

  /* One row for the checklist while it is open work. */
  const onboarding = shell.onboarding
  const guide = useMemo(
    () =>
      onboarding !== null &&
      !onboarding.isComplete &&
      onboarding.state.dismissedAt === null &&
      onboarding.totalCount > 0
        ? {
            done: onboarding.doneCount,
            total: onboarding.totalCount,
            open: () => {
              track('onboarding.opened', { source: 'command' })
              onOpenOnboarding()
            },
          }
        : null,
    [onboarding, onOpenOnboarding],
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
    /* §8.4 — the same counts the rail badges read, so a queue's number cannot
       differ between the two surfaces. */
    navCounts: shell.navCounts,
    permissions: shell.permissions,
    navigate,
    openProfile,
    guide,
  })

  const hasQuery = palette.query.trim() !== ''
  const blocks = useMemo(
    () => palette.blocks.filter((block) => block.rows.length > 0),
    [palette.blocks],
  )

  /**
   * The keys `usePalette` does not claim. `Tab` jumps to the next group's first
   * row (Juicebox) and `→` descends where the row says it can; both need the
   * active row, which is why `cmdk` is controlled here.
   */
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (palette.handleKeyDown(event)) return
      if (event.key === 'Backspace' && palette.query === '' && scope !== null) {
        event.preventDefault()
        setScope(null)
        return
      }
      if (event.key === 'Tab' && palette.confirm === null && blocks.length > 1) {
        event.preventDefault()
        const at = blocks.findIndex((block) =>
          block.rows.some((row) => row.key.toLowerCase() === active.toLowerCase()),
        )
        const step = event.shiftKey ? -1 : 1
        const next = (((at === -1 ? 0 : at + step) % blocks.length) + blocks.length) % blocks.length
        const first = blocks[next]?.rows[0]
        if (first) setActive(first.key)
        return
      }
      if (event.key === 'ArrowRight' && palette.confirm === null) {
        const caret = event.currentTarget.selectionStart ?? 0
        if (caret < palette.query.length) return
        const row = blocks
          .flatMap((block) => block.rows)
          .find((candidate) => candidate.key.toLowerCase() === active.toLowerCase())
        if (row?.onDescend) {
          event.preventDefault()
          row.onDescend()
        }
      }
    },
    [active, blocks, palette, scope],
  )

  return (
    <>
      {/* Q-P2 — a 240px trigger that LOOKS like a field, so the operator who
          reaches for "the search box" still lands in the palette's input. */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => openPalette('trigger')}
        /* The keycap is a legend and would otherwise land in the accessible
           name; `aria-keyshortcuts` is where a shortcut belongs (§13.2). */
        aria-label={t('command.trigger.label')}
        aria-keyshortcuts="Meta+K Control+K"
        className="flex h-control w-60 shrink-0 items-center gap-1.5 rounded-lg border border-input bg-card px-2 text-start outline-hidden compact:w-auto compact:min-w-0 compact:flex-1 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
      >
        <MagnifierGlyph />
        <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
          {t('command.trigger.label')}
        </span>
        {/* A chord hint on a device with no keyboard is decoration that costs
            width. It is a `<kbd>` with no semantics and no tab stop, so hiding
            it takes nothing out of the keyboard's or the reader's path. */}
        <Kbd className="shrink-0 compact:hidden">
          {t(isApplePlatform() ? 'shell.topbar.searchShortcut' : 'shell.topbar.searchShortcutWin')}
        </Kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title={t('command.palette.label')}
        description={t('command.palette.description')}
        /* AC-CP1 — the input, deterministically. Radix would otherwise focus
           the first tabbable, which is a committed chip when one is present. */
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          inputRef.current?.focus()
        }}
      >
        {/**
         * `shouldFilter={false}` because `usePalette` has already ranked; `loop`
         * so `↑` from the first row reaches the last. `value` is controlled so
         * `Tab` and `→` can move the highlight, and `cmdk` still drives it
         * through `onValueChange` when the rows change.
         */}
        <Command
          shouldFilter={false}
          loop
          value={active}
          onValueChange={setActive}
          label={t('command.palette.label')}
          className="flex h-auto min-h-0 flex-1 flex-col rounded-none p-0"
        >
          <PaletteInputRow
            palette={palette}
            t={t}
            inputRef={inputRef}
            onKeyDown={onKeyDown}
            scope={
              scope === null
                ? null
                : {
                    label: scope,
                    removeLabel: t('shell.search.removeScope', { scope }),
                    onRemove: () => setScope(null),
                  }
            }
          />

          <CommandPalette
            palette={palette}
            t={t}
            escapeHatch={
              /* §5 — ALWAYS the last row while there is a query, present
                 whether or not anything matched, and it carries the query to a
                 screen that reads it. Not offered mid-chain: a target step is
                 not a search. */
              hasQuery && palette.step === 'root' ? (
                <CommandGroup>
                  <CommandItem
                    value="__escape-hatch__"
                    className="h-9 gap-2 py-0"
                    onSelect={() => {
                      close()
                      navigate(`${ESCAPE_HATCH_PATH}?q=${encodeURIComponent(palette.query)}`)
                    }}
                  >
                    <MagnifierGlyph />
                    <span className="truncate text-sm text-foreground">
                      {scope
                        ? t('shell.search.escapeHatch', { query: palette.query, scope })
                        : t('shell.search.escapeHatchUnscoped', { query: palette.query })}
                    </span>
                    <span data-slot="command-shortcut" className="ms-auto" />
                  </CommandItem>
                </CommandGroup>
              ) : null
            }
          />

          <PaletteFooter palette={palette} t={t} language={language} />
        </Command>
      </CommandDialog>
    </>
  )
}
