/**
 * The command centre's surface — P1 of `COMMAND-PALETTE-DISCOVERY.md` §3/§4.
 *
 * `usePalette` decides what exists. This file decides what it looks like: no
 * state, no client call, no branch that changes behaviour rather than
 * appearance.
 *
 * Rules applied
 *   override    the palette is a CENTRED MODAL (RULINGS, 2026-09-05), which
 *               supersedes §2.6 and CQ-1 here and nowhere else. The panel is
 *               `DialogContent size="palette"`; this file fills it.
 *   §5          committed steps are removable chips INSIDE the input, before
 *               the query, and the scope chip (F7) takes the same shape.
 *   §5 / D18    a row is ONE LINE — icon, title, meta after ` · ` — because
 *               D18 licenses no eyebrow here. `kind: 'record'` is the one
 *               two-line row.
 *   §11.2/AC-368 a refused command renders DISABLED IN PLACE with its reason as
 *               real text, linked by `aria-describedby`. Never a tooltip.
 *   §11.3       loading is a skeleton shaped like the rows it replaces.
 *   §11.2/AC-39 a failed read is its own state, with a retry.
 *   R8          the two empties differ: nothing typed is a PROMPT, a query that
 *               matched nothing is one grey sentence.
 *   §7.2        every control is a real `<button>` with a visible ring; `cmdk`
 *               owns the roving highlight.
 *   §9.5 / §14  the magnifier does not mirror and the kbd glyph order does not;
 *               the chevron does, because it is a direction.
 *   §6.2 D-16   the confirm step's primary REPEATS THE VERB.
 */

import { useId } from 'react'
import {
  ChevronRightIcon,
  CircleDotIcon,
  CircleHelpIcon,
  ClockIcon,
  CommandIcon,
  CompassIcon,
  HistoryIcon,
  IdCardIcon,
  InboxIcon,
  SearchIcon,
  type LucideIcon,
} from 'lucide-react'
import type { PaletteChip, PaletteConfirm, PaletteModel, PaletteRow } from '@/commands'
import { Button } from '@/components/ui/button'
import { CommandGroup, CommandItem, CommandList } from '@/components/ui/command'
import { Kbd } from '@/components/ui/kbd'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { formatCount, type Language, type Translate } from '@/lib'

/* ───────────────────────────── the magnifier ───────────────────────────── */

/** §9.5 — a magnifier is an object; it does not mirror. */
export function MagnifierGlyph() {
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

/* ─────────────────────────────── the chips ─────────────────────────────── */

/**
 * The committed steps, inside the input row, before the query. A chip is a
 * real `<button>` because it is the affordance that ascends (§7.2).
 */
export function PaletteChips({ chips }: { chips: readonly PaletteChip[] }) {
  if (chips.length === 0) return null
  return (
    <>
      {chips.map((chip) => (
        <PaletteChipButton
          key={chip.key}
          label={chip.label}
          removeLabel={chip.removeLabel}
          onRemove={chip.onRemove}
        />
      ))}
    </>
  )
}

function PaletteChipButton({
  label,
  removeLabel,
  onRemove,
}: {
  label: string
  removeLabel: string
  onRemove: () => void
}) {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={removeLabel}
      className="inline-flex h-5 max-w-40 shrink-0 items-center gap-1 rounded-lg bg-neutral px-1.5 text-2xs font-semibold text-neutral-foreground outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="truncate">{label}</span>
      {/* §9.5 — a glyph that is an object, not a direction. It does not mirror. */}
      <span aria-hidden="true">✕</span>
    </button>
  )
}

/* ────────────────────────────── the input row ────────────────────────────── */

export interface PaletteInputRowProps {
  palette: PaletteModel
  t: Translate
  inputRef: React.Ref<HTMLInputElement>
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void
  /** §5's own scope chip, which `GlobalSearch` owns because it knows the route. */
  scope?: { label: string; removeLabel: string; onRemove: () => void } | null
}

/** 52px. Magnifier, committed chips, the prefix scope chip, the query, `Esc`. */
export function PaletteInputRow({
  palette,
  t,
  inputRef,
  onKeyDown,
  scope = null,
}: PaletteInputRowProps) {
  const prefix = palette.scope ?? null
  return (
    <div className="flex h-13 shrink-0 items-center gap-2 border-b border-border px-3">
      <MagnifierGlyph />
      {scope && (
        <PaletteChipButton
          label={scope.label}
          removeLabel={scope.removeLabel}
          onRemove={scope.onRemove}
        />
      )}
      <PaletteChips chips={palette.chips} />
      {/* F7 — a typed prefix mode, before the query and removable like any
          other committed step. */}
      {prefix && (
        <PaletteChipButton
          label={prefix.label}
          removeLabel={t('command.chip.remove', { label: prefix.label })}
          onRemove={prefix.onRemove}
        />
      )}
      <input
        ref={inputRef}
        type="search"
        value={palette.query}
        placeholder={palette.placeholder}
        aria-label={t('shell.topbar.search')}
        /* Read-only, never disabled, while a write is in flight: the operator
           must still read and select what they typed, and a disabled input
           leaves the tab order mid-task. */
        readOnly={palette.busy}
        onChange={(event) => palette.setQuery(event.target.value)}
        onKeyDown={onKeyDown}
        /* `appearance-none` because Chromium hangs its own unstyled clear
           cross on `type=search`, and the row already ends in `Esc`. The type
           stays: it is what makes the control a `searchbox` to a reader.
           §7.2 — no ring here, and it is the ONE control on this surface
           without one: the palette opens with this focused, so a ring would be
           permanent chrome. The caret is the indicator; the chips and the rows
           beside it keep theirs. */
        className="min-w-0 flex-1 appearance-none bg-transparent text-base text-foreground outline-hidden placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:appearance-none"
      />
      <Kbd className="shrink-0">{t('command.key.esc')}</Kbd>
    </div>
  )
}

/* ─────────────────────────────── one row ─────────────────────────────── */

/** The glyph a row takes from what it IS, so five kinds need no five renderers. */
const ROW_GLYPH: Record<NonNullable<PaletteRow['kind']>, LucideIcon> = {
  command: CommandIcon,
  destination: CompassIcon,
  record: IdCardIcon,
  target: CircleDotIcon,
  queue: InboxIcon,
  resume: ClockIcon,
  recent: HistoryIcon,
  guide: CircleHelpIcon,
  hatch: SearchIcon,
}

/** The VS Code cue: the characters the operator typed, in the title, bolder. */
function Highlight({ text, query }: { text: string; query: string }) {
  const needle = query.trim()
  const at = needle === '' ? -1 : text.toLowerCase().indexOf(needle.toLowerCase())
  if (at === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, at)}
      <span className="font-semibold">{text.slice(at, at + needle.length)}</span>
      {text.slice(at + needle.length)}
    </>
  )
}

function PaletteItem({ row, t, query }: { row: PaletteRow; t: Translate; query: string }) {
  const reasonId = useId()
  const refused = row.refusal !== null
  const Icon = row.kind ? ROW_GLYPH[row.kind] : (row.icon ?? null)
  const record = row.kind === 'record'
  /* The refusal takes the meta slot: an operator reads one line, and the
     sentence that says why is the only meta worth the space (§11.2). */
  const meta = row.refusal ?? row.subtitle
  const keys = (row.shortcut ?? '').split(' ').filter((key) => key !== '')

  return (
    <CommandItem
      value={row.key}
      /* §11.2 — DISABLED IN PLACE. It keeps its row, its place and its
         sentence; filtering it out is the defect this rule exists to kill. */
      disabled={refused}
      aria-disabled={refused || undefined}
      aria-describedby={refused ? reasonId : undefined}
      onSelect={row.onSelect}
      className={record ? 'h-12 items-start gap-2 py-1.5' : 'h-9 gap-2 py-0'}
    >
      {Icon ? (
        <Icon
          className={record ? 'mt-0.5 text-muted-foreground' : 'text-muted-foreground'}
          aria-hidden="true"
        />
      ) : null}
      {/* One line for everything but a record: the meta follows the title after
          a separator rather than taking a second line. */}
      <span
        className={
          record
            ? 'flex min-w-0 flex-1 flex-col text-start'
            : 'flex min-w-0 flex-1 items-baseline gap-1 text-start'
        }
      >
        <span className="truncate text-sm text-foreground">
          <Highlight text={row.title} query={query} />
        </span>
        {meta ? (
          <span
            id={refused ? reasonId : undefined}
            className="min-w-0 truncate text-xs text-muted-foreground"
          >
            {record ? null : <span aria-hidden="true">· </span>}
            {meta}
          </span>
        ) : null}
      </span>
      {/* `data-slot="command-shortcut"` is what tells `CommandItem` to drop the
          combobox tick, so the slot is rendered even when it is empty. */}
      <span data-slot="command-shortcut" className="ms-auto flex shrink-0 items-center gap-1">
        {keys.map((key) => (
          <Kbd key={key}>{key}</Kbd>
        ))}
        {row.badge ? (
          <span className="text-xs tabular-nums text-muted-foreground">
            {t('command.queue.count', { count: row.badge })}
          </span>
        ) : null}
        {/* §14 — a chevron is a DIRECTION, so it is the one glyph here that
            mirrors. `icons.tsx` keeps the blanket svg mirror banned. */}
        {row.descends ? (
          <ChevronRightIcon className="size-4 text-muted-foreground rtl:-scale-x-100" aria-hidden="true" />
        ) : null}
        <Kbd className="hidden group-data-selected/command-item:inline-flex">
          {t('command.key.enter')}
        </Kbd>
      </span>
    </CommandItem>
  )
}

/**
 * **D21's escape hatch**, rendered under the refusal it belongs to. Outside the
 * `CommandItem`, because a control inside a disabled row cannot be pressed.
 */
function NarrowControl({ row }: { row: PaletteRow }) {
  if (row.narrow === null) return null
  return (
    <div className="ps-2 pb-1">
      <Button variant="link" onClick={row.narrow.run}>
        {row.narrow.label}
      </Button>
    </div>
  )
}

/* ─────────────────────────────── the footer ─────────────────────────────── */

/** 36px: what the keys do at this step, then how much is on offer. */
export function PaletteFooter({
  palette,
  t,
  language,
}: {
  palette: PaletteModel
  t: Translate
  language: Language
}) {
  const confirming = palette.confirm !== null
  const hints: Array<[string, string]> = confirming
    ? [
        [t('command.key.enter'), t('command.footer.confirm')],
        [t('command.key.esc'), t('command.footer.cancel')],
      ]
    : [
        [t('command.key.arrows'), t('command.footer.move')],
        [t('command.key.enter'), t('command.footer.select')],
        [t('command.key.tab'), t('command.footer.nextGroup')],
        [t('command.key.backspace'), t('command.footer.back')],
      ]

  const total =
    palette.count ?? palette.blocks.reduce((sum, block) => sum + block.rows.length, 0)
  const atRest = palette.step === 'root' && palette.query.trim() === ''
  const tally = confirming
    ? t('command.step.confirm')
    : palette.step === 'target'
      ? t('command.target.heading')
      : atRest
        ? t('command.footer.suggestions', { count: formatCount(total, language) })
        : t('command.footer.results', { count: formatCount(total, language) })

  return (
    <div className="flex h-9 shrink-0 items-center gap-3 border-t border-border px-3 text-xs text-muted-foreground">
      {hints.map(([key, label]) => (
        <span key={label} className="flex shrink-0 items-center gap-1">
          <Kbd>{key}</Kbd>
          {label}
        </span>
      ))}
      {/* F7's one quiet hint, at rest only. */}
      {atRest && !confirming ? (
        <span className="truncate compact:hidden">{t('command.footer.prefixes')}</span>
      ) : null}
      <span className="ms-auto shrink-0 tabular-nums">{tally}</span>
    </div>
  )
}

/* ─────────────────────────────── the body ─────────────────────────────── */

export interface CommandPaletteProps {
  palette: PaletteModel
  t: Translate
  /** §5 — the always-last escape hatch. Owned by `GlobalSearch`, which knows where it goes. */
  escapeHatch: React.ReactNode
}

export function CommandPalette({ palette, t, escapeHatch }: CommandPaletteProps) {
  /* The confirm step REPLACES the list. A question stacked under eight rows is
     a question the operator scrolls past. */
  if (palette.confirm !== null) {
    return <ConfirmStep confirm={palette.confirm} busy={palette.busy} t={t} />
  }

  const atRest = palette.step === 'root' && palette.query.trim() === ''
  /* An empty group renders nothing: a `Queues (0)` heading is noise. */
  const blocks = palette.blocks.filter((block) => block.rows.length > 0)

  return (
    <CommandList className="max-h-none min-h-0 flex-1">
      {/* §11.3 — shaped like the rows it replaces, never the prompt copy. */}
      {palette.listStatus === 'loading' && (
        <div
          aria-busy="true"
          aria-label={t('shell.search.searching')}
          className="flex flex-col gap-2 px-3 py-3"
        >
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex h-9 items-center">
              <Skeleton className="h-3 w-48" />
            </div>
          ))}
        </div>
      )}

      {/* **The read failed.** Not the same sentence as "nothing matched", and
          not the same instruction (§11.2, AC-39). */}
      {palette.listStatus === 'error' && (
        <div role="alert" className="flex flex-col items-center gap-2 px-3 py-6 text-center">
          <p className="text-sm text-muted-foreground">{t('shell.search.error')}</p>
          <Button variant="ghost" onClick={palette.retry}>
            {t('shell.search.retry')}
          </Button>
        </div>
      )}

      {/* R8 — nothing asked yet and nothing to offer is a PROMPT; a question
          that matched nothing is one grey sentence. */}
      {palette.listStatus === 'empty' && (
        <p className="px-3 py-6 text-center text-sm text-muted-foreground">
          {atRest
            ? t('shell.search.prompt')
            : palette.step === 'target'
              ? t('command.target.noMatch', {
                  entity: t('command.entity.driver.plural'),
                  query: palette.query,
                })
              : t('shell.search.noMatch', { query: palette.query })}
        </p>
      )}

      {blocks.map((block) => (
        <CommandGroup key={block.id} heading={block.heading}>
          {block.rows.map((row) => (
            <div key={row.key}>
              <PaletteItem row={row} t={t} query={palette.query} />
              <NarrowControl row={row} />
            </div>
          ))}
        </CommandGroup>
      ))}

      {escapeHatch}
    </CommandList>
  )
}

/* ────────────────────────────── confirm step ────────────────────────────── */

/**
 * §3's third state, in §9.1 / §5.3's shape: the title states the verb and the
 * count, the body states the consequence and what will not change, and the
 * primary repeats the verb. Every string is the command's own, because the copy
 * belongs to the action rather than to the surface.
 *
 * **`needs-input` is not a confirmation** (D18): where the request carries a
 * `reason`, this step collects the sentence the captain will be shown, and the
 * primary stays unavailable until there is one (§10.4).
 */
function ConfirmStep({
  confirm,
  busy,
  t,
}: {
  confirm: PaletteConfirm
  busy: boolean
  t: Translate
}) {
  const reasonId = useId()
  const helpId = useId()
  const { request } = confirm

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-foreground">{request.title}</p>
        <p className="text-xs text-muted-foreground">{request.body}</p>
      </div>

      {request.reason ? (
        <div className="flex flex-col gap-1">
          <label htmlFor={reasonId} className="text-xs font-medium text-foreground">
            {request.reason.label}
          </label>
          <Textarea
            id={reasonId}
            aria-describedby={helpId}
            autoFocus
            value={confirm.reason}
            readOnly={busy}
            placeholder={t('command.confirm.reasonPlaceholder')}
            onChange={(event) => confirm.setReason(event.target.value)}
            className="min-h-14"
          />
          <p id={helpId} className="text-xs text-muted-foreground">
            {request.reason.help}
          </p>
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        {/* `Enter to confirm` holds only where the field being typed in is the
            search field. A reason step moves focus into the textarea, where
            `Enter` is a newline, so the hint is not shown where it would lie. */}
        {request.reason === undefined && !busy ? (
          <span className="me-auto text-xs text-muted-foreground">{t('command.confirm.hint')}</span>
        ) : (
          <span className="me-auto" />
        )}
        <Button variant="ghost" onClick={confirm.cancel} disabled={busy}>
          {t('command.confirm.cancel')}
        </Button>
        {/* R3 — the one primary on this surface, and it REPEATS THE VERB. Blue,
            not red: R5a spends red on the unrecoverable. */}
        <Button
          variant="default"
          onClick={confirm.submit ?? undefined}
          disabled={confirm.submit === null}
        >
          {busy ? t('command.confirm.working') : request.confirmLabel}
        </Button>
      </div>
    </div>
  )
}
