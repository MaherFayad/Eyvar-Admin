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
import {
  Field,
  FieldControl,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
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
import { ConfirmDialog, type ConfirmRequest } from '@/components/ConfirmDialog'

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
  /**
   * **The confirm this modal did not have.**
   *
   * `Send` was one click to an entire audience — 28,460 devices on the default —
   * with no confirm, no recall, and no audit row. It is the single widest-blast
   * action in the product and it was the only one with nothing in front of it.
   *
   * `docs/05-restructure/design/12-refusal-and-undo-surfaces.md`'s test is
   * whether an act can be undone; a push that has left cannot, and the record
   * lands `queued` with no cancel. That is exactly the case a confirm is for —
   * and the reason this is a confirm rather than an undo.
   */
  const [pendingConfirm, setPendingConfirm] = useState<ConfirmRequest | null>(null)
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
    <>
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent size="default">
        <DialogHeader>
          <DialogTitle>{t('comms.push.composer.title')}</DialogTitle>
          <DialogDescription>{t('comms.push.composer.desc')}</DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field id="push-audience">
            <FieldLabel>{t('comms.push.composer.audience')}</FieldLabel>
            {audiences.status === 'loading' ? (
              <LoadingSkeleton pattern="P4" rows={1} label={t('comms.push.composer.audience')} />
            ) : (
              <Select
                value={audienceId}
                onValueChange={(value) => setAudienceId(value as PushAudienceId)}
              >
                <FieldControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FieldControl>
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
              <FieldDescription>
                {t('comms.push.devices', { count: formatCount(selected.deviceCount, language) })}
              </FieldDescription>
            )}
          </Field>

          <Field id="push-title">
            <FieldLabel>{t('comms.push.composer.msgTitle')}</FieldLabel>
            <FieldControl>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} />
            </FieldControl>
          </Field>

          <Field id="push-body">
            <FieldLabel>{t('comms.push.composer.msgBody')}</FieldLabel>
            <FieldControl>
              <Textarea rows={3} value={body} onChange={(event) => setBody(event.target.value)} />
            </FieldControl>
          </Field>

          <Field id="push-link">
            <FieldLabel optional={t('field.optional')}>
              {t('comms.push.composer.deepLink')}
            </FieldLabel>
            <FieldControl>
              {/* §9.2 — a deep link is Latin in both languages. */}
              <Input
                value={deepLink}
                dir="ltr"
                onChange={(event) => setDeepLink(event.target.value)}
              />
            </FieldControl>
            <FieldDescription>{t('comms.push.composer.deepLinkHelp')}</FieldDescription>
          </Field>

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
        </FieldGroup>

        <DialogFooter>
          {/* §11.2 — the send is disabled in place and says why. */}
          {blockedReason !== null && (
            <span className="me-auto text-xs text-muted-foreground">{blockedReason}</span>
          )}
          <Button size="xs" variant="secondary" onClick={onClose} disabled={sending}>
            {t('comms.push.composer.cancel')}
          </Button>
          <Button
            size="xs"
            onClick={() =>
              setPendingConfirm({
                title: t('comms.push.confirm.title', {
                  /* `AUDIENCE_LABEL`, the same map the picker renders — not a key
                     built from the id. A template key silently produced
                     `comms.audience.online-captains`, which does not exist, so
                     `t()` threw inside the handler and the confirm never opened
                     while the send went through. */
                  audience: selected ? t(AUDIENCE_LABEL[selected.id]) : '',
                }),
                /* The count is the fact that decides it, so it is in the sentence
                   rather than left on the screen behind the dialog. */
                body: t('comms.push.confirm.body', {
                  count: formatCount(selected?.deviceCount ?? 0, language),
                }),
                confirmLabel: t('comms.push.confirm.action'),
                /* Not `destructive`: R5a reserves red for the unrecoverable
                   DESTRUCTION of something that exists. This creates a message —
                   irreversible, but not a deletion. */
                onConfirm: () => void send(),
              })
            }
            disabled={blockedReason !== null || sending}
          >
            {sending ? t('comms.push.composer.sending') : t('comms.push.composer.send')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* A SIBLING of the composer, not a child. A `Dialog` nested inside another
        `Dialog` does not render, which is how the first attempt at this confirm
        measured as working while never appearing. */}
    <ConfirmDialog
      request={pendingConfirm}
      onClose={() => setPendingConfirm(null)}
      busy={sending}
      t={t}
    />
    </>
  )
}
