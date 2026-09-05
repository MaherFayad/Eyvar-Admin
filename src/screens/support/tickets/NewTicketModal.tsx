/**
 * Raise a ticket (S-4, SUPPORT-UX-PLAN.md §5.3). One form for the queue, the
 * conversation pane and the profile: the requester and channel arrive locked
 * where the caller knows them. The channel is required, never defaulted
 * (AC-S-15), and the promises the chosen code makes are stated before commit (§8).
 */

import { useEffect, useState } from 'react'
import {
  createTicket,
  createTicketForConversation,
  getOperationalPolicy,
  listReasonCodeOptions,
} from '@/data/clients'
import {
  CONVERSATION_CHANNELS,
  isApiError,
  type ConversationChannel,
  type Ticket,
  type TicketPriority,
} from '@/data/types'
import type { OperationalPolicy, ReasonCode } from '@/data/types/policy'
import { PRIORITY_BY_TIER, categoryOf, ticketSlaTargets } from '@/data/types/ticket'
import { useAsync } from '@/hooks'
import { formatDuration, type Language, type Translate } from '@/lib'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldControl, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { RefusalLine } from '@/components/table/rowActions'
import { RequesterPicker, type Requester } from '../shared/RequesterPicker'

export type TicketRequester = Requester

export interface NewTicketModalProps {
  open: boolean
  onClose: () => void
  onCreated: (ticket: Ticket) => void
  t: Translate
  language: Language
  /** Known by the caller (a conversation, a profile): rendered as text, not a field. */
  locked?: { requester: TicketRequester; channel: ConversationChannel; conversationId: string | null } | null
}

const PRIORITIES: readonly TicketPriority[] = ['Critical', 'High', 'Medium', 'Low']

export function NewTicketModal({ open, onClose, onCreated, t, language, locked = null }: NewTicketModalProps) {
  const [requester, setRequester] = useState<TicketRequester | null>(null)
  const [reasonCode, setReasonCode] = useState<string>('')
  const [priority, setPriority] = useState<TicketPriority | ''>('')
  const [subject, setSubject] = useState('')
  const [channel, setChannel] = useState<ConversationChannel | ''>('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  /* A reopened dialog starts clean, with what the caller locked already in
     place. Keyed on the locked VALUES, not the object: a caller that rebuilds
     the object per render must not wipe a half-typed form. */
  const lockKey = locked === null ? '' : `${locked.conversationId ?? ''}:${locked.requester.entityId}:${locked.channel}`
  useEffect(() => {
    if (!open) return
    setRequester(locked?.requester ?? null)
    setReasonCode('')
    setPriority('')
    setSubject('')
    setChannel(locked?.channel ?? '')
    setMessage('')
    setFailure(null)
    setBusy(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `lockKey` stands for `locked`
  }, [open, lockKey])

  const codes = useAsync<ReasonCode[]>((signal) => listReasonCodeOptions('ticket', signal), {
    deps: ['ticket'],
    cacheKey: 'policy.reasonCodeOptions',
    enabled: open,
  })
  const policy = useAsync<OperationalPolicy>((signal) => getOperationalPolicy(signal), {
    deps: ['new-ticket'],
    cacheKey: 'policy.get',
    enabled: open,
  })
  const code = (codes.data ?? []).find((each) => each.key === reasonCode) ?? null
  /* The code's tier names the priority; the operator may override it. */
  const effectivePriority: TicketPriority | '' = priority !== '' ? priority : code ? PRIORITY_BY_TIER[code.tier] : ''
  const targets = code && policy.data ? ticketSlaTargets(policy.data, code.key) : null

  const refusal: string | null =
    requester === null
      ? t('ticket.new.blocked.requester')
      : reasonCode === ''
        ? t('ticket.new.blocked.reasonCode')
        : subject.trim() === ''
          ? t('ticket.new.blocked.subject')
          : channel === ''
            ? t('ticket.new.blocked.channel')
            : null

  async function handleConfirm() {
    if (refusal !== null || requester === null || channel === '' || effectivePriority === '') return
    setBusy(true)
    setFailure(null)
    try {
      const created =
        locked?.conversationId != null
          ? (
              await createTicketForConversation(locked.conversationId, {
                subject: subject.trim(),
                category: categoryOf(reasonCode),
                reasonCode,
                priority: effectivePriority,
              })
            ).ticket
          : await createTicket({
              subject: subject.trim(),
              entityId: requester.entityId,
              entityName: requester.entityName,
              entityType: requester.entityType,
              category: categoryOf(reasonCode),
              reasonCode,
              priority: effectivePriority,
              channel,
              ...(message.trim() === '' ? {} : { initialMessage: message.trim() }),
            })
      onCreated(created)
    } catch (error) {
      setFailure(t('ticket.new.failed', { reason: isApiError(error) ? error.message : String(error) }))
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  return (
    <Dialog open onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('ticket.new.title')}</DialogTitle>
          <DialogDescription>{t('ticket.new.desc')}</DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field id="new-ticket-requester">
            <FieldLabel>{t('ticket.new.requester')}</FieldLabel>
            <RequesterPicker
              value={requester}
              onChange={setRequester}
              accept={['rider', 'driver', 'corporate']}
              locked={locked !== null}
              placeholderKey="ticket.new.requester.placeholder"
              copyPrefix="ticket.new.requester"
              t={t}
            />
          </Field>

          <Field id="new-ticket-reason">
            <FieldLabel>{t('ticket.new.reasonCode')}</FieldLabel>
            <Select value={reasonCode} onValueChange={setReasonCode} disabled={busy}>
              <FieldControl>
                <SelectTrigger>
                  <SelectValue placeholder={t('ticket.new.reasonCode.placeholder')} />
                </SelectTrigger>
              </FieldControl>
              <SelectContent>
                {(codes.data ?? []).map((each) => (
                  <SelectItem key={each.key} value={each.key}>
                    {language === 'ar' ? each.labels.ar : each.labels.en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {targets !== null && (
              /* §8: the promises this code makes, stated before commit. */
              <FieldDescription>
                {t('ticket.new.promises', {
                  firstReply: formatDuration(targets.firstResponseMinutes * 60_000),
                  resolution: formatDuration(targets.resolutionMinutes * 60_000),
                })}
              </FieldDescription>
            )}
          </Field>

          <Field id="new-ticket-priority">
            <FieldLabel>{t('ticket.new.priority')}</FieldLabel>
            <Select
              value={effectivePriority}
              onValueChange={(value) => setPriority(value as TicketPriority)}
              disabled={busy || code === null}
            >
              <FieldControl>
                <SelectTrigger>
                  <SelectValue placeholder={t('ticket.new.priority.placeholder')} />
                </SelectTrigger>
              </FieldControl>
              <SelectContent>
                {PRIORITIES.map((each) => (
                  <SelectItem key={each} value={each}>
                    {t(`ticket.priority.${each}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>{t('ticket.new.priority.help')}</FieldDescription>
          </Field>

          <Field id="new-ticket-subject">
            <FieldLabel>{t('ticket.new.subject')}</FieldLabel>
            <FieldControl>
              <Input value={subject} onChange={(event) => setSubject(event.target.value)} required disabled={busy} />
            </FieldControl>
          </Field>

          <Field id="new-ticket-channel">
            <FieldLabel>{t('ticket.new.channel')}</FieldLabel>
            {locked !== null ? (
              <p className="text-xs text-foreground">{t(`ticket.channel.${locked.channel}`)}</p>
            ) : (
              <Select value={channel} onValueChange={(value) => setChannel(value as ConversationChannel)} disabled={busy}>
                <FieldControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('ticket.new.channel.placeholder')} />
                  </SelectTrigger>
                </FieldControl>
                <SelectContent>
                  {CONVERSATION_CHANNELS.map((each) => (
                    <SelectItem key={each} value={each}>
                      {t(`ticket.channel.${each}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <FieldDescription>{t('ticket.new.channel.help')}</FieldDescription>
          </Field>

          {locked?.conversationId == null && (
            <Field id="new-ticket-message">
              <FieldLabel optional={t('field.optional')}>{t('ticket.new.message')}</FieldLabel>
              <FieldControl>
                <Textarea rows={3} value={message} onChange={(event) => setMessage(event.target.value)} disabled={busy} />
              </FieldControl>
              <FieldDescription>{t('ticket.new.message.help')}</FieldDescription>
            </Field>
          )}
        </FieldGroup>

        {failure !== null && (
          <p role="alert" className="text-xs font-medium text-destructive">
            {failure}
          </p>
        )}

        <DialogFooter>
          <Button variant="secondary" size="xs" onClick={onClose} disabled={busy}>
            {t('ticket.new.cancel')}
          </Button>
          <span className="flex flex-col items-stretch gap-1">
            <Button
              size="xs"
              onClick={() => void handleConfirm()}
              disabled={busy || refusal !== null}
              aria-describedby={refusal === null ? undefined : 'new-ticket-refusal'}
            >
              {busy ? t('ticket.new.saving') : t('ticket.new.confirm')}
            </Button>
            {refusal !== null && <RefusalLine id="new-ticket-refusal">{refusal}</RefusalLine>}
          </span>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
