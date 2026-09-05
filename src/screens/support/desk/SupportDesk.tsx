/**
 * Support › Overview › the desk (SUPPORT-UX-PLAN.md §6.2, S-5): who is on
 * call, what is waiting, who is on shift, and one primary that claims the
 * next ticket. Sits above the metric board; the board's tiles stay the board's.
 */

import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  getOnCallRota,
  getTeamUser,
  listAgentPresence,
  listConversations,
  listTickets,
  takeNextTicket,
} from '@/data/clients'
import type { AgentPresence, PresenceState } from '@/data/types'
import { isApiError } from '@/data/types'
import { useAsync } from '@/hooks'
import { formatCount } from '@/lib'
import type { Language, Translate } from '@/lib'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ErrorState'
import { StatusBadge } from '@/components/StatusBadge'
import { useShell } from '@/shell/ShellContext'
import { withFallback } from '../../operations/localCopy'
import { SUPPORT_DESK_EN } from './copy'

const TONE: Readonly<Record<PresenceState, 'success' | 'warning' | 'neutral'>> = {
  online: 'success',
  away: 'warning',
  offline: 'neutral',
}

interface DeskReading {
  onCallName: string | null
  unassignedTickets: number
  breachedTickets: number
  waitingChats: number
  roster: readonly AgentPresence[]
}

async function readDesk(signal: AbortSignal): Promise<DeskReading> {
  const [rota, tickets, chats, roster] = await Promise.all([
    getOnCallRota(signal),
    listTickets({ view: 'open', pageSize: 200 }, signal),
    listConversations({ view: 'unassigned', pageSize: 1 }, signal),
    listAgentPresence(signal),
  ])
  const onCallName = rota.primaryUserId === null ? null : (await getTeamUser(rota.primaryUserId, signal)).name
  return {
    onCallName,
    unassignedTickets: tickets.items.filter((t) => t.ownerId === null).length,
    breachedTickets: tickets.items.filter((t) => t.slaBreached).length,
    waitingChats: chats.total,
    roster,
  }
}

export function SupportDesk() {
  const shell = useShell()
  const navigate = useNavigate()
  const t = useMemo(() => withFallback(shell.language.t, SUPPORT_DESK_EN), [shell.language.t])
  const { language } = shell.language
  const [revision, setRevision] = useState(0)
  const [taking, setTaking] = useState(false)
  const desk = useAsync(readDesk, { deps: [revision] })
  const me = shell.session?.userId ?? null

  const takeNext = async () => {
    setTaking(true)
    try {
      const ticket = await takeNextTicket()
      toast(t('desk.takeNext.done', { id: ticket.id }))
      navigate(`/support/tickets/${ticket.id}`)
    } catch (error) {
      toast.error(isApiError(error) && error.status === 404 ? t('desk.takeNext.empty') : t('desk.takeNext.failed'))
      setRevision((n) => n + 1)
    } finally {
      setTaking(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
        <CardTitle>{t('desk.title')}</CardTitle>
        <Button size="xs" onClick={() => void takeNext()} disabled={taking}>
          {t('desk.takeNext')}
        </Button>
      </CardHeader>
      <CardContent>
        {desk.status === 'loading' && (
          <div aria-busy="true" className="grid grid-cols-3 gap-6 compact:grid-cols-1">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        )}
        {desk.status === 'error' && (
          <ErrorState
            scope="card"
            card={false}
            message={t('desk.error')}
            action={{ label: t('desk.retry'), onClick: desk.refetch }}
          />
        )}
        {desk.data && (
          <DeskBody reading={desk.data} me={me} t={t} language={language} />
        )}
      </CardContent>
    </Card>
  )
}

function DeskBody({
  reading,
  me,
  t,
  language,
}: {
  reading: DeskReading
  me: string | null
  t: Translate
  language: Language
}) {
  const others = reading.roster.filter((agent) => agent.userId !== me)
  return (
    <div className="grid grid-cols-3 gap-6 compact:grid-cols-1">
      <section className="flex flex-col gap-1">
        <h3 className="text-xs font-medium text-muted-foreground">{t('desk.onCall')}</h3>
        <p className={reading.onCallName === null ? 'text-sm text-warning-foreground' : 'text-sm font-semibold text-foreground'}>
          {reading.onCallName ?? t('desk.onCall.unassigned')}
        </p>
        <Link to="/admin/team" className="text-xs text-primary underline-offset-2 hover:underline">
          {t('desk.onCall.manage')}
        </Link>
      </section>

      <section className="flex flex-col gap-1">
        <h3 className="text-xs font-medium text-muted-foreground">{t('desk.queue')}</h3>
        <dl className="flex flex-col gap-0.5 text-sm">
          <QueueLine
            label={t('desk.queue.unassignedTickets')}
            count={reading.unassignedTickets}
            to="/support/tickets?view=unassigned"
            language={language}
          />
          <QueueLine
            label={t('desk.queue.breachedTickets')}
            count={reading.breachedTickets}
            to="/support/tickets?view=open&filter=breached"
            language={language}
            critical
          />
          <QueueLine
            label={t('desk.queue.waitingChats')}
            count={reading.waitingChats}
            to="/support/contact-centre?view=unassigned"
            language={language}
          />
        </dl>
      </section>

      <section className="flex flex-col gap-1">
        <h3 className="text-xs font-medium text-muted-foreground">{t('desk.team')}</h3>
        {others.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('desk.team.empty')}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {others.map((agent) => (
              <li key={agent.userId} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-medium text-foreground">{agent.userName}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {t(agent.activeCount === 1 ? 'desk.team.load.one' : 'desk.team.load.other', {
                      count: formatCount(agent.activeCount, language),
                    })}
                  </span>
                  <StatusBadge tone={TONE[agent.state]}>{t(`desk.state.${agent.state}`)}</StatusBadge>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

/* D-21: the count is text, and a breach count above zero reads in the critical tone. */
function QueueLine({
  label,
  count,
  to,
  language,
  critical = false,
}: {
  label: string
  count: number
  to: string
  language: Language
  critical?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt>
        <Link to={to} className="text-foreground underline-offset-2 hover:underline">
          {label}
        </Link>
      </dt>
      <dd className={critical && count > 0 ? 'font-semibold text-destructive' : 'font-semibold text-foreground'}>
        {formatCount(count, language)}
      </dd>
    </div>
  )
}
