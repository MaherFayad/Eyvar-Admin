/**
 * The command centre's surface — **P3-T5 … P3-T9**,
 * `design/05-command-centre.md`, D9.
 *
 * `usePalette` decides what exists. This file decides what it looks like, and
 * nothing else: there is no state here, no client call, and no branch that
 * changes behaviour rather than appearance. That split is what lets the model
 * be tested without a DOM and the chrome be reviewed without a fixture.
 *
 * Rules applied
 *   §2.6 / CQ-1  the palette stays an **anchored popover on the field**. It is
 *                never a centred overlay — §2.6's reason (never relocate the
 *                thing the operator aimed at) survives the surface growing a
 *                confirm step. The list is **capped at 8 rows with an internal
 *                scroll** and the confirm step **replaces** the list rather
 *                than extending it, which is what keeps the whole inside a
 *                1280×720 viewport.
 *   §5           the committed steps are **removable chips INSIDE the input**,
 *                before the query — the same shape and the same position as
 *                §5's scope chip, because they are the same idea. Never a
 *                separate dropdown outside the field.
 *   §5           a row is TWO LINES: title, then metadata separated by `·`.
 *                Not `›` — it is result metadata, not a breadcrumb (§2.6).
 *   §11.2/AC-368 **a refused command is rendered, disabled, with its reason as
 *                REAL TEXT on a second line** — never hidden, never a tooltip
 *                (§5.7 confines a tooltip to *naming* a control). The reason is
 *                linked with `aria-describedby`, because a screen reader has no
 *                proximity to read.
 *   §11.3        loading is a **skeleton shaped like the rows it replaces**,
 *                never a spinner and never prompt copy.
 *   §11.2/AC-39  a failed read is **its own state** with a retry. It is not the
 *                same sentence as "nothing matched", and not the same
 *                instruction.
 *   R8           the two empties are different: nothing typed yet is a PROMPT,
 *                a query that matched nothing is ONE grey sentence.
 *   §7.2         everything interactive is a real `<button>` with a visible
 *                focus ring. `cmdk` owns the roving highlight, so `CommandItem`
 *                carries the selection state and the chips carry their own
 *                `focus-visible` ring.
 *   §9.5 / §14   the chips' POSITION mirrors because the row is a logical flex
 *                row; the `✕` glyph does not mirror and neither does the
 *                magnifier. Every utility here is logical (`ms-`/`me-`/`ps-`).
 *   §5.7         a section heading is a NOUN; a command row is a VERB PHRASE.
 *                Both come from the dictionary; nothing is built here.
 *   §6.2 D-16    the confirm step's primary **repeats the verb** — it is
 *                `command.confirmLabel`, from the command, never `OK`.
 */

import { useId } from 'react'
import type { PaletteChip, PaletteConfirm, PaletteModel, PaletteRow } from '@/commands'
import { Button } from '@/components/ui/button'
import { CommandGroup, CommandItem, CommandList } from '@/components/ui/command'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import type { Translate } from '@/lib'

/* ─────────────────────────────── the chips ─────────────────────────────── */

/**
 * The committed steps, inside the field, before the query.
 *
 * A chip is a real `<button>` — it is the affordance that ascends — so it is
 * focusable, has a visible ring, and carries the removal as its accessible
 * name. The legacy console has 253 non-focusable click handlers; this is not
 * the 254th.
 */
export function PaletteChips({ chips }: { chips: readonly PaletteChip[] }) {
  if (chips.length === 0) return null
  return (
    <>
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onRemove}
          aria-label={chip.removeLabel}
          className="inline-flex h-5 max-w-40 shrink-0 items-center gap-1 rounded-lg bg-neutral px-1.5 text-2xs font-semibold text-neutral-foreground outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="truncate">{chip.label}</span>
          {/* §9.5 — a glyph that is an object, not a direction. It does not mirror. */}
          <span aria-hidden="true">✕</span>
        </button>
      ))}
    </>
  )
}

/* ─────────────────────────────── one row ─────────────────────────────── */

function PaletteItem({ row, t }: { row: PaletteRow; t: Translate }) {
  const reasonId = useId()
  const Icon = row.icon
  const refused = row.refusal !== null

  return (
    <CommandItem
      value={row.key}
      /* §11.2 — DISABLED IN PLACE. `cmdk` skips it with the arrow keys and
         renders it at reduced opacity; it stays in the list, in its place, with
         its sentence. Filtering it out is the defect this rule exists to kill. */
      disabled={refused}
      aria-disabled={refused || undefined}
      aria-describedby={refused ? reasonId : undefined}
      onSelect={row.onSelect}
      className="items-start gap-2"
    >
      {Icon ? <Icon className="mt-0.5 text-muted-foreground" aria-hidden="true" /> : null}
      <span className="flex min-w-0 flex-1 flex-col gap-0 text-start">
        <span className="truncate text-sm text-foreground">{row.title}</span>
        {row.subtitle ? (
          <span className="truncate text-xs text-muted-foreground">{row.subtitle}</span>
        ) : null}
        {/* The refusal, as real text. Never a tooltip, never a toast after the
            click — the operator learns why before they reach for it. */}
        {row.refusal ? (
          <span id={reasonId} className="text-xs text-muted-foreground">
            {row.refusal}
          </span>
        ) : null}
      </span>
      {row.badge ? (
        <span className="ms-auto shrink-0 text-xs tabular-nums text-muted-foreground">
          {t('command.queue.count', { count: row.badge })}
        </span>
      ) : null}
    </CommandItem>
  )
}

/**
 * **D21's escape hatch**, rendered under the refusal it belongs to.
 *
 * Outside the `CommandItem`, because the item is disabled and a control inside
 * a `pointer-events-none` row cannot be pressed — and because it is not the
 * command. It never runs anything; it changes the selection and stops.
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

/* ─────────────────────────────── the body ─────────────────────────────── */

export interface CommandPaletteProps {
  palette: PaletteModel
  t: Translate
  /** §5 — the always-last escape hatch. Owned by `GlobalSearch`, which knows where it goes. */
  escapeHatch: React.ReactNode
}

export function CommandPalette({ palette, t, escapeHatch }: CommandPaletteProps) {
  /* The confirm step REPLACES the list (CQ-1). A question stacked under eight
     rows is a question the operator scrolls past. */
  if (palette.confirm !== null) {
    return <ConfirmStep confirm={palette.confirm} busy={palette.busy} t={t} />
  }

  const atRest = palette.step === 'root' && palette.query.trim() === ''

  return (
    /* CQ-1's cap: eight rows, then an internal scroll. */
    <CommandList className="max-h-72">
      {/* §11.3 — shaped like the two-line rows it replaces. It must never
          render the prompt copy: telling an operator mid-keystroke to start
          searching is the defect the shell already fixed once. */}
      {palette.listStatus === 'loading' && (
        <div
          aria-busy="true"
          aria-label={t('shell.search.searching')}
          className="flex flex-col gap-2 px-3 py-3"
        >
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex flex-col gap-1">
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-2.5 w-32" />
            </div>
          ))}
        </div>
      )}

      {/* **The read failed.** Not the same sentence as "nothing matched", and
          not the same instruction: this one says try again and carries the
          control that does (§11.2, AC-39). `role="alert"`, because an operator
          watching the list has no other signal that what they are reading is
          not an answer. */}
      {palette.listStatus === 'error' && (
        <div role="alert" className="flex flex-col items-center gap-2 px-3 py-6 text-center">
          <p className="text-sm text-muted-foreground">{t('shell.search.error')}</p>
          <Button variant="ghost" onClick={palette.retry}>
            {t('shell.search.retry')}
          </Button>
        </div>
      )}

      {/* R8 — the two empties are different things. Nothing has been asked yet
          and the palette has nothing to offer: a PROMPT. A question that
          matched nothing: ONE grey sentence, no illustration, no heading. */}
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

      {palette.blocks.map((block) => (
        <CommandGroup key={block.id} heading={block.heading}>
          {block.rows.map((row) => (
            <div key={row.key}>
              <PaletteItem row={row} t={t} />
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
 * §3's third state, and §9.1 / §5.3's shape: the title states the **verb and
 * the count**, the body states the consequence **and what will not change**,
 * and the primary **repeats the verb**.
 *
 * Every string here is the command's — `CommandConfirmRequest` — because the
 * copy belongs to the action and not to the surface. That is what makes "a
 * destructive command reached from a row confirms in a modal, reached from the
 * palette confirms in the palette" two shapes of one decision instead of two
 * decisions.
 *
 * **`needs-input` is not a confirmation** (D18). Where the request carries a
 * `reason`, this step is collecting the sentence the captain will be shown —
 * `suspendDriver` requires it by contract — and the primary stays unavailable
 * until there is one. §10.4: validated here, never returned as a 422 the
 * operator has to interpret.
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
    <div className="flex flex-col gap-3 p-3">
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
            /* Read-only, never disabled, while a write is in flight — the same
               rule the freeze contract states, and for the same reason: the
               operator must still be able to read and select what they typed. */
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
        {/* `Enter to confirm` holds only where the field the operator is
            typing in is the SEARCH field. A reason step moves focus into the
            textarea, where `Enter` is a newline and the primary is the
            affordance — so the hint is not shown where it would be a lie. */}
        {request.reason === undefined && !busy ? (
          <span className="me-auto text-xs text-muted-foreground">{t('command.confirm.hint')}</span>
        ) : (
          <span className="me-auto" />
        )}
        <Button variant="ghost" onClick={confirm.cancel} disabled={busy}>
          {t('command.confirm.cancel')}
        </Button>
        {/* R3 — the one primary on this surface, and it REPEATS THE VERB.
            Never `OK`, never `Confirm`. Blue, not red: R5a spends red on the
            unrecoverable, and everything reachable here is reversible or asks
            for a reason first. */}
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
