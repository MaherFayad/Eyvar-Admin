/**
 * A subscription's commands on the record sheet, resolved from
 * `src/commands/subscriptions.ts` so the queue, this sheet and the palette hold
 * one answer and one write (X9, D9), and `Freeze` carries D18's undo here too.
 * `Change captain` stays a screen action beside them; `reassignRefusal` is the
 * one predicate both surfaces ask. §5.5 is suspended knowingly — see `ActionBar`.
 */

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  SETTLE_REASONS,
  SUBSCRIPTION_COMMANDS,
  reassignRefusal,
  resolveCommands,
  runCommand,
  toastOutcome,
  unavailableReason,
  type Command,
  type CommandConfirmChoice,
  type CommandContext,
  type CommandHost,
  type CommandResult,
} from '@/commands'
import { reassignSubscriptionDriver } from '@/data/clients'
import type { Subscription } from '@/data/types'
import type { Language, Translate } from '@/lib'
import { ActionBar, type SheetAction } from './ActionBar'
import { CancelSettleModal } from './CancelSettleModal'
import { ChangeDriverModal } from './ChangeDriverModal'
import { FreezeModal } from './FreezeModal'

/** CM-1 — the sheet acts on one record, so the row kebab's list. */
const SHEET_COMMANDS = resolveCommands(SUBSCRIPTION_COMMANDS, {
  entityType: 'subscription',
  plural: false,
})

export interface SubscriptionActionsProps {
  subscription: Subscription
  /** Whether this operator holds the write permission. Gates every command. */
  canWrite: boolean
  onOpenFullRecord: () => void
  /** Called after a write lands, so the owner of the record can re-read it. */
  onDone: () => void
  t: Translate
  language: Language
}

export function SubscriptionActions({
  subscription,
  canWrite,
  onOpenFullRecord,
  onDone,
  t,
  language,
}: SubscriptionActionsProps) {
  const [freezing, setFreezing] = useState(false)
  const [settling, setSettling] = useState(false)
  const [reassigning, setReassigning] = useState(false)
  const [busy, setBusy] = useState(false)
  const [choice, setChoice] = useState<CommandConfirmChoice | null>(null)
  const asking = useRef<string>('')
  const answer = useRef<((reason: string | null) => void) | null>(null)
  const settled = useRef<{ ok: () => void; fail: (error: unknown) => void } | null>(null)

  const host: CommandHost = {
    /* The sheet IS the profile surface, so a command asking to open one has
       nowhere further to go. */
    openProfile: () => onOpenFullRecord(),
    confirm: (request) =>
      new Promise<string | null>((resolve) => {
        answer.current = resolve
        setChoice(request.choice ?? null)
        if (asking.current === 'subscription.cancel') setSettling(true)
        else setFreezing(true)
      }),
  }

  /* A set of one — the predicate takes an array because the bulk bar does, and
     passing `[record]` is what makes a single record impossible to refuse
     differently from the same record inside a selection. */
  const context = (): CommandContext<Subscription> => ({
    targets: [subscription],
    t,
    language,
    session: { canWrite },
    host,
  })

  async function dispatch(command: Command<Subscription>) {
    if (busy) return
    asking.current = command.id
    setBusy(true)
    let result: CommandResult<Subscription>
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
    setFreezing(false)
    setSettling(false)
    setChoice(null)
    if (result.kind === 'refused') {
      toast(result.reason)
      return
    }
    if (result.kind === 'cancelled' || result.outcome === null) return
    onDone()
    toastOutcome(result.outcome, t)
  }

  /* §11.2 — the same sentence the queue's row menu shows, from one function. */
  const reassign = reassignRefusal(subscription, { canWrite, t })

  const actions: SheetAction[] = [
    {
      id: 'subscription-change-driver',
      label: t('subs.action.changeDriver'),
      onSelect: () => setReassigning(true),
      disabled: reassign !== null || busy,
      reason: reassign,
    },
    ...SHEET_COMMANDS.map((command) => {
      const refusal = unavailableReason(command, context())
      return {
        id: command.id,
        label: t(command.titleKey),
        onSelect: () => void dispatch(command),
        disabled: refusal !== null || busy,
        reason: refusal,
      }
    }),
  ]

  return (
    <>
      <ActionBar
        onOpenFullRecord={onOpenFullRecord}
        openLabel={t('shell.layer.openFullProfile')}
        actions={actions}
      />

      <FreezeModal
        subscriptions={freezing ? [subscription] : []}
        choice={choice}
        onClose={() => {
          answer.current?.(null)
          answer.current = null
          setFreezing(false)
        }}
        onConfirm={(_subs, reason) =>
          new Promise<void>((ok, fail) => {
            settled.current = { ok, fail }
            answer.current?.(reason)
            answer.current = null
          })
        }
        language={language}
        t={t}
      />

      <CancelSettleModal
        subscription={subscription}
        reasonKeys={SETTLE_REASONS}
        open={settling}
        onClose={() => {
          answer.current?.(null)
          answer.current = null
          setSettling(false)
        }}
        onConfirm={(_id, reason) =>
          new Promise<void>((ok, fail) => {
            settled.current = { ok, fail }
            answer.current?.(reason)
            answer.current = null
          })
        }
        language={language}
        t={t}
      />

      <ChangeDriverModal
        subscription={reassigning ? subscription : null}
        open={reassigning}
        onClose={() => setReassigning(false)}
        onConfirm={async (id, driverId, driverName, reason) => {
          const changed = await reassignSubscriptionDriver(id, driverId, reason)
          setReassigning(false)
          onDone()
          /* R9 — one line naming the object, and the name the SERVER returned. */
          toast(t('subs.toast.reassigned', { name: changed.driverName ?? driverName }))
        }}
        unavailableReason={reassign}
        t={t}
      />
    </>
  )
}
