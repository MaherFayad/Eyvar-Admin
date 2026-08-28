import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { claimTicket, getTicket, replyTicket, resolveTicket } from '@/data/clients/tickets'
import type { Ticket } from '@/data/types'
import { useAsync } from '@/hooks'
import { formatDate } from '@/lib'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { PageHeader } from '@/components/PageHeader'
import { DetailPage } from '@/components/PageShell'
import { StatusBadge } from '@/components/StatusBadge'
import { useShell } from '@/shell/ShellContext'
import { withOverlay } from '@/shell/routeState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { BookOpen, MessageSquare, Phone, Send, User } from 'lucide-react'
import { LogCallModal } from './LogCallModal'

const PRIORITY_TONES: Record<string, 'warning' | 'info' | 'neutral' | 'new' | 'success'> = {
  Critical: 'warning',
  High: 'warning',
  Medium: 'info',
  Low: 'neutral',
}

export function TicketDetailScreen() {
  const shell = useShell()
  const navigate = useNavigate()
  const { ticketId = '' } = useParams<{ ticketId: string }>()
  const { t, dir, language } = shell.language

  const ticket = useAsync<Ticket>(
    (signal) => getTicket(ticketId, signal),
    { deps: [ticketId] }
  )

  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [logCallOpen, setLogCallOpen] = useState(false)
  const [localTicket, setLocalTicket] = useState<Ticket | null>(null)

  const data = localTicket ?? ticket.data
  const currentUserId = shell.session?.userId ?? 'USR-1'
  const currentUserName = shell.session?.name ?? 'Sarah Al-Rashid'
  const canWrite = shell.permissions.permissions.includes('manage_tickets')

  const handleClaim = async () => {
    if (!data) return
    try {
      const updated = await claimTicket(data.id, currentUserId, currentUserName)
      setLocalTicket(updated)
      toast.success(t('support.toast.claimed', { defaultValue: 'Ticket {id} assigned to you', id: data.id }))
    } catch {
      toast.error(t('support.toast.claimError', { defaultValue: 'Failed to claim ticket' }))
    }
  }

  const handleSendReply = async () => {
    if (!data || !replyText.trim()) return
    setSendingReply(true)
    try {
      const updated = await replyTicket(data.id, replyText.trim(), currentUserId, currentUserName)
      setLocalTicket(updated)
      setReplyText('')
      toast.success(t('support.toast.replied', { defaultValue: 'Response sent to customer' }))
    } catch {
      toast.error(t('support.toast.replyError', { defaultValue: 'Failed to send response' }))
    } finally {
      setSendingReply(false)
    }
  }

  const handleResolve = async () => {
    if (!data) return
    try {
      const updated = await resolveTicket(data.id)
      setLocalTicket(updated)
      toast.success(t('support.toast.resolved', { defaultValue: 'Ticket {id} marked as resolved', id: data.id }))
    } catch {
      toast.error(t('support.toast.resolveError', { defaultValue: 'Failed to resolve ticket' }))
    }
  }

  const handleLogCallConfirm = () => {
    toast.success(t('support.toast.callLogged', { defaultValue: 'Support call logged successfully' }))
  }

  if (ticket.status === 'loading') {
    return (
      <DetailPage
        header={<PageHeader title={ticketId} onBack={() => navigate(-1)} t={t} dir={dir} />}
        main={<LoadingSkeleton pattern="P2" />}
        rail={[]}
      />
    )
  }

  if (ticket.status === 'error' || !data) {
    return (
      <DetailPage
        header={<PageHeader title={ticketId} onBack={() => navigate(-1)} t={t} dir={dir} />}
        main={
          <ErrorState
            scope="page"
            heading={t('support.error.notFound', { defaultValue: 'Ticket not found' })}
            message={t('support.error.notFoundDesc', { defaultValue: 'Ticket {id} does not exist.', id: ticketId })}
            action={{ label: t('action.goBack', { defaultValue: 'Back to Tickets' }), onClick: () => navigate(-1) }}
          />
        }
        rail={[]}
      />
    )
  }

  const header = (
    <PageHeader
      title={data.subject}
      meta={`${data.id} · ${data.entityName} (${data.entityId}) · ${data.category}`}
      onBack={() => navigate('/support/tickets')}
      primaryAction={
        canWrite && data.status !== 'resolved' && data.status !== 'closed'
          ? {
              label: t('support.action.resolve', { defaultValue: 'Resolve Ticket' }),
              onClick: handleResolve,
            }
          : undefined
      }
      t={t}
      dir={dir}
    />
  )

  const main = (
    <div className="flex flex-col gap-5">
      {/* 1. Call Center Guide Script Card */}
      {data.callGuideScript && (
        <Card className="border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" />
              {t('support.guideScript', { defaultValue: 'Call Center Guide Script — Scenario: {scenario}', scenario: data.callGuideScript.scenario })}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2 text-foreground">
            <div>
              <span className="font-semibold text-amber-900 dark:text-amber-200 block mb-0.5">
                {t('support.script.whatToSay', { defaultValue: 'What to say to customer:' })}
              </span>
              <p className="italic text-muted-foreground bg-background/80 p-2.5 rounded border border-amber-200/60 dark:border-amber-900/60">
                "{data.callGuideScript.say}"
              </p>
            </div>
            <div>
              <span className="font-semibold text-amber-900 dark:text-amber-200 block mb-0.5">
                {t('support.script.whatToDo', { defaultValue: 'Required Ops Actions:' })}
              </span>
              <p className="text-muted-foreground">{data.callGuideScript.do}</p>
            </div>
            <div className="text-[11px] font-mono text-muted-foreground pt-1">
              Policy Reference: {data.callGuideScript.policyRef}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. Conversation Thread & Message List */}
      <Card>
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            {t('support.conversationThread', { defaultValue: 'Conversation Thread' })}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="space-y-3">
            {data.messages.map((msg) => {
              const isAgent = msg.senderType === 'agent'
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col max-w-[85%] rounded-lg p-3 text-xs ${
                    isAgent
                      ? 'ml-auto bg-muted/40 border border-border text-foreground'
                      : 'mr-auto bg-primary/10 border border-primary/20 text-foreground'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-1 text-[11px] text-muted-foreground">
                    <span className="font-semibold">{msg.senderName} ({msg.senderType})</span>
                    <span>{formatDate(msg.sentAt, { language })}</span>
                  </div>
                  <p className="whitespace-pre-wrap">{msg.body}</p>
                </div>
              )
            })}
          </div>

          {/* Composer */}
          {canWrite && data.status !== 'closed' && (
            <div className="pt-3 border-t border-border space-y-2">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={t('support.replyPlaceholder', { defaultValue: 'Type response to customer...' })}
                rows={3}
                className="text-xs"
              />
              <div className="flex items-center justify-between">
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={() => setLogCallOpen(true)}
                  className="gap-1"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {t('support.logCall', { defaultValue: 'Log Call Wrap-up' })}
                </Button>
                <Button
                  size="xs"
                  onClick={handleSendReply}
                  disabled={!replyText.trim() || sendingReply}
                  className="gap-1"
                >
                  <Send className="h-3 w-3" />
                  {sendingReply ? t('action.saving', { defaultValue: 'Sending...' }) : t('action.send', { defaultValue: 'Send Reply' })}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )

  const rail = [
    <Card key="ticket-meta">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t('support.ticketDetails', { defaultValue: 'Ticket Meta' })}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2.5">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">{t('column.status', { defaultValue: 'Status' })}:</span>
          <StatusBadge tone={data.status === 'resolved' ? 'success' : data.status === 'open' ? 'warning' : 'info'}>
            {data.status}
          </StatusBadge>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">{t('column.priority', { defaultValue: 'Priority' })}:</span>
          <StatusBadge tone={PRIORITY_TONES[data.priority] ?? 'neutral'}>
            {data.priority}
          </StatusBadge>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('support.reasonCode', { defaultValue: 'Reason Code' })}:</span>
          <span className="font-mono font-medium text-foreground">{data.reasonCode}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('support.owner', { defaultValue: 'Owner' })}:</span>
          <span className="font-medium text-foreground">{data.ownerName ?? 'Unassigned'}</span>
        </div>
        {!data.ownerId && canWrite && (
          <Button size="xs" variant="secondary" onClick={handleClaim} className="w-full mt-1">
            {t('support.claimTicket', { defaultValue: 'Claim Ticket' })}
          </Button>
        )}
      </CardContent>
    </Card>,
    <Card key="requester-profile">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <User className="h-3.5 w-3.5" />
          {t('support.requester', { defaultValue: 'Requester 360' })}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{data.entityName}</span>
          <span className="font-mono text-muted-foreground text-[11px]">{data.entityId} ({data.entityType})</span>
        </div>
        <Button
          variant="secondary"
          size="xs"
          onClick={() => navigate({ pathname: location.pathname, search: withOverlay(location.search, 'entity', data.entityId) })}
          className="w-full mt-1"
        >
          {t('action.viewProfile', { defaultValue: 'View 360° Profile' })}
        </Button>
      </CardContent>
    </Card>,
  ]

  return (
    <>
      <DetailPage header={header} main={main} rail={rail} />

      <LogCallModal
        ticketId={data.id}
        entityName={data.entityName}
        open={logCallOpen}
        onClose={() => setLogCallOpen(false)}
        onConfirm={handleLogCallConfirm}
        t={t}
      />
    </>
  )
}
