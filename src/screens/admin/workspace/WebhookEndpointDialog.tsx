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
 *   G7         `Field` throughout. This closes a real §10.4 defect this file
 *              carried: the error used to REPLACE the helper sentence by
 *              recolouring one `<span>`. §10.4 requires the message to be
 *              INSERTED below the field, replacing nothing — the constraint is
 *              still true while the field is wrong, and taking it away at the
 *              moment the operator needs it most is the opposite of help.
 *   G6         `default` — three controls plus an eight-box checkbox set, all
 *              single-region.
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
import {
  Field,
  FieldContent,
  FieldControl,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'

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

        <FieldGroup>
          <Field id={`${dialogId}-name`} invalid={nameError !== null} disabled={busy}>
            <FieldLabel>{t('admin.integrations.webhook.name.label')}</FieldLabel>
            <FieldControl>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                onBlur={() => setTouched(true)}
              />
            </FieldControl>
            <FieldDescription>{t('admin.integrations.webhook.name.help')}</FieldDescription>
            <FieldError>{nameError}</FieldError>
          </Field>

          <Field id={`${dialogId}-url`} invalid={urlError !== null} disabled={busy}>
            <FieldLabel>{t('admin.integrations.webhook.url.label')}</FieldLabel>
            <FieldControl>
              <Input
                value={url}
                dir="ltr"
                onChange={(event) => setUrl(event.target.value)}
                onBlur={() => setTouched(true)}
              />
            </FieldControl>
            <FieldDescription>{t('admin.integrations.webhook.url.help')}</FieldDescription>
            <FieldError>{urlError}</FieldError>
          </Field>

          {/* A checkbox set answers ONE question, so the refusal describes the
              `<fieldset>` rather than any single box. */}
          <FieldSet aria-describedby={eventError === null ? undefined : `${dialogId}-events-error`}>
            <FieldLegend>{t('admin.integrations.webhook.events.label')}</FieldLegend>
            <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-border p-2">
              {WEBHOOK_EVENT_KEYS.map((event) => (
                <Field
                  key={event}
                  id={`${dialogId}-event-${event}`}
                  orientation="horizontal"
                  disabled={busy}
                  className="py-0.5"
                >
                  <FieldControl>
                    <Checkbox
                      checked={events.includes(event)}
                      onCheckedChange={(value) =>
                        setEvents((current) =>
                          value === true
                            ? [...current, event]
                            : current.filter((each) => each !== event),
                        )
                      }
                    />
                  </FieldControl>
                  <FieldContent className="gap-0">
                    <FieldLabel className="text-xs leading-4">{t(eventLabelKey(event))}</FieldLabel>
                    {/* The wire name, beside the sentence and never instead of
                        it: it is what the receiving developer greps for, and it
                        is untranslatable by construction. */}
                    <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                      {event}
                    </span>
                  </FieldContent>
                </Field>
              ))}
            </div>
            <FieldError id={`${dialogId}-events-error`}>{eventError}</FieldError>
          </FieldSet>
        </FieldGroup>

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
              <span id={`${dialogId}-blocked`} className="text-xs text-muted-foreground">
                {t('admin.integrations.webhook.blocked')}
              </span>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
