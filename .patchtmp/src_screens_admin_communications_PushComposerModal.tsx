/**
 * The push composer — rewritten so that the send is real.
 *
 * What changed and why:
 *
 * **The audiences come from the client.** They were four hard-coded English
 * `SelectItem`s. Now they are `PushAudience` records with a device count, which
 * is what lets the composer say how many devices a choice reaches **before**
 * the operator commits, and what the recorded broadcast counts afterwards.
 *
 * **The send is a client call, not a `setTimeout`.** It was
 * `setTimeout(300)` followed by a local array push carrying
 * `deliveredCount: 142`. The number was invented, and an operator reading it
 * had no way to know. `sendPushBroadcast` returns the record; the card renders
 * the record.
 *
 * **Every string is a key** (AC-74) and the disabled send states its reason in
 * place (§11.2) rather than going quiet.
 */

import { useCallback, useEffect, useState } from 'react'
import { listPushAudiences, sendPushBroadcast } from '@/data/clients'
import type { PushAudience, PushAudienceId, PushBroadcast } from '@/data/types/email'
import { formatCount, type Language, type Translate } from '@/lib'
import { useAsync } from '@/hooks'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Banner } from '@/components/Banner'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { AUDIENCE_LABEL } from './PushBroadcastsCard'

export interface PushComposerModalProps {
  open: boolean
  onClose: () => void
  /** Called with the record the client returned, never with an invented one. */
  onSent: (broadcast: PushBroadcast) => void
  t: Translate
  language: Language
  actorId: string
}

const DEFAULT_AUDIENCE: PushAudienceId = 'online-captains'

export function PushComposerModal({
  open,
  onClose,
  onSent,
  t,
  language,
  actorId,
}: PushComposerModalProps) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [audienceId, setAudienceId] = useState<PushAudienceId>(DEFAULT_AUDIENCE)
  const [deepLink, setDeepLink] = useState('')
  const [sending, setSending] = useState(false)
  const [failed, setFailed] = useState(false)

  /* Held until the dialog opens: a modal that fetches on mount fetches for
     every operator who never opens it. */
  const audiences = useAsync<PushAudience[]>((signal) => listPushAudiences(signal), {
    /* A fixed audience list the fetcher varies on nothing for; reopening the
       composer should not re-pay for it. */
    enabled: open,
    deps: [open],
    cacheKey: 'push.audiences.list',
  })

  useEffect(() => {
    if (open) return
    setTitle('')
    setBody('')
    setDeepLink('')
    setFailed(false)
    setAudienceId(DEFAULT_AUDIENCE)
  }, [open])

  const selected = (audiences.data ?? []).find((audience) => audience.id === audienceId) ?? null

  const send = useCallback(async () => {
    setSending(true)
    setFailed(false)
    try {
      const broadcast = await sendPushBroadcast({
        title: title.trim(),
        body: body.trim(),
        audienceId,
        deepLink: deepLink.trim() === '' ? null : deepLink.trim(),
        actorId,
      })
      onSent(broadcast)
      onClose()
    } catch {
      setFailed(true)
    } finally {
      setSending(false)
    }
  }, [actorId, audienceId, body, deepLink, onClose, onSent, title])

  const incomplete = title.trim() === '' || body.trim() === ''
  const blockedReason = incomplete
    ? t('comms.push.composer.incomplete')
    : audiences.status === 'error'
      ? t('comms.push.composer.audiencesError')
      : null

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('comms.push.composer.title')}</DialogTitle>
          <DialogDescription>{t('comms.push.composer.desc')}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="push-audience" className="text-xs font-medium">
              {t('comms.push.composer.audience')}
            </Label>
            {audiences.status === 'loading' ? (
              <LoadingSkeleton pattern="P4" rows={1} label={t('comms.push.composer.audience')} />
            ) : (
              <Select
                value={audienceId}
                onValueChange={(value) => setAudienceId(value as PushAudienceId)}
              >
                <SelectTrigger id="push-audience">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(audiences.data ?? []).map((audience) => (
                    <SelectItem key={audience.id} value={audience.id}>
                      {t(AUDIENCE_LABEL[audience.id])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {/* The size of what is about to happen, before it happens. */}
            {selected !== null && (
              <span className="text-2xs text-muted-foreground">
                {t('comms.push.devices', { count: formatCount(selected.deviceCount, language) })}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="push-title" className="text-xs font-medium">
              {t('comms.push.composer.msgTitle')}
            </Label>
            <Input id="push-title" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="push-body" className="text-xs font-medium">
              {t('comms.push.composer.msgBody')}
            </Label>
            <Textarea
              id="push-body"
              rows={3}
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="push-link" className="text-xs font-medium">
              {t('comms.push.composer.deepLink')}
            </Label>
            <Input
              id="push-link"
              value={deepLink}
              onChange={(event) => setDeepLink(event.target.value)}
            />
            <span className="text-2xs text-muted-foreground">
              {t('comms.push.composer.deepLinkHelp')}
            </span>
          </div>

          {audiences.status === 'error' && (
            <Banner
              variant="card"
              banner={{
                id: 'push-audiences-failed',
                tone: 'warning',
                title: t('comms.push.composer.audiencesError'),
              }}
            />
          )}

          {failed && (
            <Banner
              variant="card"
              banner={{
                id: 'push-send-failed',
                tone: 'warning',
                title: t('comms.push.composer.error'),
              }}
            />
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {/* §11.2 — the send is disabled in place and says why. */}
          {blockedReason !== null && (
            <span className="me-auto text-2xs text-muted-foreground">{blockedReason}</span>
          )}
          <Button size="xs" variant="secondary" onClick={onClose} disabled={sending}>
            {t('comms.push.composer.cancel')}
          </Button>
          <Button size="xs" onClick={() => void send()} disabled={blockedReason !== null || sending}>
            {sending ? t('comms.push.composer.sending') : t('comms.push.composer.send')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
