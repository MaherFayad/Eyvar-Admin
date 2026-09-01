/**
 * Register or edit a webhook endpoint — target, subscription list, and nothing
 * else.
 *
 * The enabled state is **not** here. It is a one-click act on the endpoint row
 * with an immediate effect, and burying it in a form behind a `Save` would make
 * *"stop calling this endpoint, now"* a three-step operation at the moment it
 * is most likely to be urgent (§4.3 — a switch is for instant-effect settings;
 * a boolean saved with a form is a checkbox. This form has no such boolean).
 *
 * The signing secret is not here either, in either direction: it is minted by
 * the client on create, revealed exactly once by `SecretRevealDialog`, and
 * replaced only by an explicit rotation. There is no field for it because
 * there is nothing to put in one — see `data/types/integrations.ts`.
 *
 * ## Rules applied
 *   §10.4      the URL and the empty-subscription refusal are validated here,
 *              before the mutation, with the message under the field. The
 *              client validates again — a limit that lives only in the browser
 *              is a limit the next surface skips.
 *   §4.3       event subscriptions are checkboxes: they are saved with the form.
 *   §5.7       the primary repeats the verb — `Register endpoint` / `Save
 *              endpoint`, never `OK`.
 *   §9.1       the URL field is `dir="ltr"` because its CONTENT is a Latin URL
 *              whichever way the page reads.
 *   §7.4.5     a placeholder is never a label.
 */

import { useEffect, useId, useState } from 'react'
import { WEBHOOK_EVENT_KEYS, type WebhookEndpoint, type WebhookEventKey } from '@/data/types/integrations'
import type { Translate } from '@/lib'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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

/** One key per event. Never a prefix plus an interpolated event name. */
const EVENT_LABEL: Record<WebhookEventKey, string> = {
  'trip.completed': 'admin.integrations.event.tripCompleted',
  'trip.cancelled': 'admin.integrations.event.tripCancelled',
  'subscription.activated': 'admin.integrations.event.subscriptionActivated',
  'subscription.expired': 'admin.integrations.event.subscriptionExpired',
  'payout.paid': 'admin.integrations.event.payoutPaid',
  'payment.failed': 'admin.integrations.event.paymentFailed',
  'driver.approved': 'admin.integrations.event.driverApproved',
  'rider.registered': 'admin.integrations.event.riderRegistered',
}

export function eventLabelKey(event: WebhookEventKey): string {
  return EVENT_LABEL[event]
}

export interface EndpointDraftSubmission {
  name: string
  url: string
  events: WebhookEventKey[]
}

export function WebhookEndpointDialog({
  open,
  /** `null` registers a new endpoint; an endpoint edits that one. */
  editing,
  busy,
  serverErrors,
  onSubmit,
  onClose,
  t,
}: {
  open: boolean
  editing: WebhookEndpoint | null
  busy: boolean
  serverErrors: Record<string, string>
  onSubmit: (draft: EndpointDraftSubmission) => void
  onClose: () => void
  t: Translate
}) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [events, setEvents] = useState<WebhookEventKey[]>([])
  const [touched, setTouched] = useState(false)
  const dialogId = useId()

  useEffect(() => {
    if (!open) return
    setName(editing?.name ?? '')
    setUrl(editing?.url ?? '')
    setEvents(editing === null ? [] : [...editing.events])
    setTouched(false)
  }, [open, editing])

  if (!open) return null

  /* The same shape the client enforces. Stated once here so the operator hears
     about it before a round trip, and once there so no other surface can skip
     it — the rule `workspace.updateLogo` sets for the 200 KB cap. */
  const urlValid = /^https:\/\/[^\s/]+\.[^\s/]+(\/\S*)?$/.test(url.trim())
  const nameError =
    serverErrors['name'] ??
    (touched && name.trim() === '' ? t('admin.integrations.webhook.name.required') : null)
  const urlError =
    serverErrors['url'] ?? (touched && !urlValid ? t('admin.integrations.webhook.url.invalid') : null)
  const eventError =
    serverErrors['events'] ??
    (touched && events.length === 0 ? t('admin.integrations.webhook.events.required') : null)
  const incomplete = name.trim() === '' || !urlValid || events.length === 0

  return (
    <Dialog open onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent size="default">
        <DialogHeader>
          <DialogTitle>
            {editing === null
              ? t('admin.integrations.webhook.create.title')
              : t('admin.integrations.webhook.edit.title')}
          </DialogTitle>
          <DialogDescription>
            {editing === null
              ? t('admin.integrations.webhook.create.desc')
              : t('admin.integrations.webhook.edit.desc')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${dialogId}-name`}>{t('admin.integrations.webhook.name.label')}</Label>
          <Input
            id={`${dialogId}-name`}
            value={name}
            disabled={busy}
            aria-invalid={nameError !== null}
            aria-describedby={`${dialogId}-name-help`}
            onChange={(event) => setName(event.target.value)}
            onBlur={() => setTouched(true)}
          />
          <span
            id={`${dialogId}-name-help`}
            className={nameError !== null ? 'text-2xs text-destructive' : 'text-2xs text-muted-foreground'}
          >
            {nameError ?? t('admin.integrations.webhook.name.help')}
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${dialogId}-url`}>{t('admin.integrations.webhook.url.label')}</Label>
          <Input
            id={`${dialogId}-url`}
            value={url}
            dir="ltr"
            disabled={busy}
            aria-invalid={urlError !== null}
            aria-describedby={`${dialogId}-url-help`}
            onChange={(event) => setUrl(event.target.value)}
            onBlur={() => setTouched(true)}
          />
          <span
            id={`${dialogId}-url-help`}
            className={urlError !== null ? 'text-2xs text-destructive' : 'text-2xs text-muted-foreground'}
          >
            {urlError ?? t('admin.integrations.webhook.url.help')}
          </span>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-xs font-semibold text-foreground">
            {t('admin.integrations.webhook.events.label')}
          </legend>
          <div className="grid grid-cols-1 gap-1.5 rounded-lg border border-border p-2 md:grid-cols-2">
            {WEBHOOK_EVENT_KEYS.map((event) => {
              const id = `${dialogId}-event-${event}`
              return (
                <div key={event} className="flex items-start gap-2 py-0.5">
                  <Checkbox
                    id={id}
                    checked={events.includes(event)}
                    disabled={busy}
                    onCheckedChange={(value) =>
                      setEvents((current) =>
                        value === true
                          ? [...current, event]
                          : current.filter((each) => each !== event),
                      )
                    }
                  />
                  <Label htmlFor={id} className="flex flex-col gap-0.5 text-2xs leading-4 font-normal">
                    <span>{t(eventLabelKey(event))}</span>
                    {/* The wire name, beside the sentence and never instead of
                        it: it is what the receiving developer greps for, and it
                        is untranslatable by construction. */}
                    <span className="font-mono text-muted-foreground" dir="ltr">
                      {event}
                    </span>
                  </Label>
                </div>
              )
            })}
          </div>
          {eventError !== null && <span className="text-2xs text-destructive">{eventError}</span>}
        </fieldset>

        <DialogFooter>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="xs" disabled={busy} onClick={onClose}>
                {t('admin.integrations.cancel')}
              </Button>
              <Button
                size="xs"
                disabled={busy || incomplete}
                aria-describedby={incomplete ? `${dialogId}-blocked` : undefined}
                onClick={() => {
                  setTouched(true)
                  if (!incomplete) onSubmit({ name: name.trim(), url: url.trim(), events })
                }}
              >
                {busy
                  ? t('admin.integrations.webhook.saving')
                  : editing === null
                    ? t('admin.integrations.webhook.create')
                    : t('admin.integrations.webhook.save')}
              </Button>
            </div>
            {incomplete && (
              <span id={`${dialogId}-blocked`} className="text-2xs text-muted-foreground">
                {t('admin.integrations.webhook.blocked')}
              </span>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
