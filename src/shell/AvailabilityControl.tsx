/**
 * The operator's availability, in the top bar (SUPPORT-UX-PLAN.md §6.3, D19).
 * Renders nothing for an operator who is not on the presence roster. Going
 * offline while holding live chats asks for a handover first (§6.4).
 */

import { useState } from 'react'
import { toast } from 'sonner'
import { listConversations, transferConversation } from '@/data/clients'
import type { PresenceState } from '@/data/types'
import { formatCount, type Language, type Translate } from '@/lib'
import { cn } from '@/lib/utils'
import type { PresenceModel } from '@/hooks'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ORDER: readonly PresenceState[] = ['online', 'away', 'offline']

/* R7: the dot is never alone; the word beside it carries the state. */
const DOT: Readonly<Record<PresenceState, string>> = {
  online: 'bg-success',
  away: 'bg-warning',
  offline: 'bg-muted-foreground',
}

export interface AvailabilityControlProps {
  presence: PresenceModel
  t: Translate
  language: Language
}

export function AvailabilityControl({ presence, t, language }: AvailabilityControlProps) {
  const [handover, setHandover] = useState<{ count: number } | null>(null)
  const state = presence.myState

  if (presence.me === null || state === null) return null

  const choose = (next: PresenceState) => {
    if (next === state) return
    const held = presence.liveChats ?? 0
    if (next === 'offline' && held > 0) {
      setHandover({ count: held })
      return
    }
    presence.setState(next)
    toast(t(`shell.presence.toast.${next}`))
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            size="xs"
            disabled={presence.saving}
            aria-label={t('shell.presence.label', { state: t(`shell.presence.${state}`) })}
          >
            <span aria-hidden="true" className={cn('size-2 rounded-full', DOT[state])} />
            {t(`shell.presence.${state}`)}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-40">
          <DropdownMenuLabel>{t('shell.presence.title')}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup value={state} onValueChange={(next) => choose(next as PresenceState)}>
            {ORDER.map((option) => (
              <DropdownMenuRadioItem key={option} value={option}>
                {t(`shell.presence.${option}`)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {handover !== null && (
        <HandoverDialog
          count={handover.count}
          presence={presence}
          t={t}
          language={language}
          onClose={() => setHandover(null)}
        />
      )}
    </>
  )
}

/**
 * §6.4: the chats go to one named colleague, or stay held. Either way the
 * operator goes offline; D19 says a held claim survives going offline.
 */
function HandoverDialog({
  count,
  presence,
  t,
  language,
  onClose,
}: {
  count: number
  presence: PresenceModel
  t: Translate
  language: Language
  onClose: () => void
}) {
  const [target, setTarget] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const online = presence.transferTargets.filter((agent) => agent.state === 'online')

  const goOffline = () => {
    presence.setState('offline')
    onClose()
  }

  const handOver = async () => {
    if (target === null) return
    setBusy(true)
    try {
      const mine = await listConversations({ view: 'mine', channel: 'chat', pageSize: 100 })
      await Promise.all(
        mine.items.map((c) => transferConversation(c.id, target, { note: t('shell.presence.handover.note') })),
      )
      const name = online.find((agent) => agent.userId === target)?.userName ?? ''
      toast(t('shell.presence.handover.done', { count: formatCount(mine.items.length, language), name }))
      goOffline()
    } catch {
      toast.error(t('shell.presence.handover.failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AlertDialog open onOpenChange={(next) => !next && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('shell.presence.handover.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('shell.presence.handover.body', { count: formatCount(count, language) })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-1">
          <Label htmlFor="presence-handover-target">{t('shell.presence.handover.to')}</Label>
          {online.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('shell.presence.handover.nobody')}</p>
          ) : (
            <Select value={target ?? undefined} onValueChange={setTarget} disabled={busy}>
              <SelectTrigger id="presence-handover-target" className="w-full">
                <SelectValue placeholder={t('shell.presence.handover.choose')} />
              </SelectTrigger>
              <SelectContent>
                {online.map((agent) => (
                  <SelectItem key={agent.userId} value={agent.userId}>
                    {t('shell.presence.handover.option', {
                      name: agent.userName,
                      count: formatCount(agent.activeCount, language),
                    })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <AlertDialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t('shell.presence.handover.cancel')}
          </Button>
          <Button variant="secondary" onClick={goOffline} disabled={busy}>
            {t('shell.presence.handover.keep')}
          </Button>
          <Button onClick={() => void handOver()} disabled={busy || target === null}>
            {t('shell.presence.handover.confirm')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
