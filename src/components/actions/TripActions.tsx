/**
 * A ride's two commands on the record sheet, resolved from
 * `src/commands/trips.ts` so the queue, this sheet and the palette hold one
 * answer and one write (X9, D9), and `Flag` carries D18's undo here too.
 * §5.5 is suspended knowingly; `ActionBar`'s header carries the decision.
 */

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  FLAG_REASONS,
  TRIP_COMMANDS,
  resolveCommands,
  runCommand,
  toastOutcome,
  unavailableReason,
  type Command,
  type CommandContext,
  type CommandHost,
  type CommandResult,
} from '@/commands'
import type { Trip } from '@/data/types'
import type { Language, Translate } from '@/lib'
import { ActionBar, type SheetAction } from './ActionBar'
import { FlagTripModal } from './FlagTripModal'

/** CM-1 — the sheet acts on one record, so the row kebab's list. */
const SHEET_COMMANDS = resolveCommands(TRIP_COMMANDS, { entityType: 'trip', plural: false })

export interface TripActionsProps {
  trip: Trip
  /** Whether this operator holds the write permission. Gates both commands. */
  canWrite: boolean
  onOpenFullRecord: () => void
  /** Called after a write lands, so the owner of the record can re-read it. */
  onDone: () => void
  t: Translate
  language: Language
}

export function TripActions({
  trip,
  canWrite,
  onOpenFullRecord,
  onDone,
  t,
  language,
}: TripActionsProps) {
  const [flagging, setFlagging] = useState(false)
  const [busy, setBusy] = useState(false)
  const answer = useRef<((reason: string | null) => void) | null>(null)
  const settled = useRef<{ ok: () => void; fail: (error: unknown) => void } | null>(null)

  const host: CommandHost = {
    /* The sheet IS the profile surface, so a command asking to open one has
       nowhere further to go. */
    openProfile: () => onOpenFullRecord(),
    confirm: () =>
      new Promise<string | null>((resolve) => {
        answer.current = resolve
        setFlagging(true)
      }),
  }

  /* A set of one — the predicate takes an array because the bulk bar does, and
     passing `[record]` is what makes a single record impossible to refuse
     differently from the same record inside a selection. */
  const context = (): CommandContext<Trip> => ({
    targets: [trip],
    t,
    language,
    session: { canWrite },
    host,
  })

  async function dispatch(command: Command<Trip>) {
    if (busy) return
    setBusy(true)
    let result: CommandResult<Trip>
    try {
      result = await runCommand(command, context())
    } catch (error: unknown) {
      settled.current?.fail(error)
      settled.current = null
      setBusy(false)
      return
    }
    settled.current?.ok()
    settled.current = null
    setBusy(false)
    setFlagging(false)
    if (result.kind === 'refused') {
      toast(result.reason)
      return
    }
    if (result.kind === 'cancelled' || result.outcome === null) return
    onDone()
    toastOutcome(result.outcome, t)
  }

  const actions: SheetAction[] = SHEET_COMMANDS.map((command) => {
    const refusal = unavailableReason(command, context())
    return {
      id: command.id,
      label: t(command.titleKey),
      onSelect: () => void dispatch(command),
      disabled: refusal !== null || busy,
      reason: refusal,
    }
  })

  return (
    <>
      <ActionBar
        onOpenFullRecord={onOpenFullRecord}
        openLabel={t('profile.trip.footer.open')}
        actions={actions}
      />

      <FlagTripModal
        trips={flagging ? [trip] : []}
        reasonKeys={FLAG_REASONS}
        onClose={() => {
          answer.current?.(null)
          answer.current = null
          setFlagging(false)
        }}
        onConfirm={(_trips, reason) =>
          new Promise<void>((ok, fail) => {
            settled.current = { ok, fail }
            answer.current?.(reason)
            answer.current = null
          })
        }
        t={t}
      />
    </>
  )
}
