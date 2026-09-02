/**
 * **The one-time reveal — AC-951's whole point, as a surface.**
 *
 * `DECISIONS.md` **AC-951** says the secret is *"displayed exactly once"* and
 * that reopening the row afterwards shows *"only its prefix"*. That is a UI
 * sentence sitting on top of a data-model question, and
 * `data/types/integrations.ts` rules it: **the secret is not stored.** Only a
 * digest and a display prefix survive the issuing call, so there is no re-read
 * path — not by reopening the row, not by an export, not by support, not by a
 * query. Rotation is the answer to *"I lost it"*, and it is the only answer
 * there can be.
 *
 * ## Why this is not a toast, and not an ordinary dialog
 *
 * `docs/ref/surfaces.md`'s test is whether the operator can afford to miss it.
 * A toast is dismissible by ignoring it, and ignoring this one costs a
 * credential and forces a rotation. A dialog with an `×` and a `Done` button is
 * barely better: both are one reflexive click away, and the operator learns
 * whether it mattered afterwards.
 *
 * So this dialog has **no close affordance at all** until the consequence has
 * been acknowledged:
 *
 *   - `showCloseButton={false}` — no `×`;
 *   - `onEscapeKeyDown` and `onInteractOutside` are prevented while
 *     unacknowledged, so neither `Escape` nor a click on the overlay discards
 *     the only copy of a live credential;
 *   - the single **checkbox** is the gate. `Done` renders at all times and is
 *     **disabled in place with its reason** (§11.2), never hidden;
 *   - the consequence is stated as a **warning banner above the secret**, not
 *     as helper text beneath it, because it has to be read before the operator
 *     has finished copying rather than after.
 *
 * Nothing here is red. **R5a** licenses red in four places and *"a warning you
 * must read"* is not one of them; the warning tone plus the acknowledgement
 * gate carries it, and a red dialog for a successful issue would be the wrong
 * word for a thing that went right.
 *
 * ## Rules applied
 *   R5a        no red. The tone is `warning`, and the gate does the work.
 *   §11.2      `Done` is disabled in place, with `aria-describedby` pointing at
 *              the sentence that says why.
 *   §5.7       the primary repeats the verb of the moment — `I have copied it`
 *              — never `OK`, never `Close`.
 *   §7.2       every control is a real `<button>`/`<input>` with its own ring;
 *              focus is trapped by `dialog.tsx`.
 *   §9.1       the secret itself is `dir="ltr"` because its CONTENT is a Latin
 *              token whichever way the page reads — the same reasoning that
 *              gives the Arabic wordmark field `dir="rtl"` on this screen.
 *              Every other utility here is logical.
 *   §7.5       the copied confirmation is a word, never a colour change alone.
 */

import { useEffect, useId, useRef, useState } from 'react'
import { Check, Copy, KeyRound } from 'lucide-react'
import type { Translate } from '@/lib'
import { Banner } from '@/components/Banner'
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

/**
 * What was just minted. Held by the screen for exactly as long as this dialog
 * is open, and dropped when it closes — there is nowhere else it could be kept
 * that would not be a second store of a secret.
 */
export interface RevealRequest {
  /** Which sentence set to use. The two credentials are not interchangeable. */
  kind: 'api-key' | 'webhook-secret'
  /** Whether this was the first issue or a rotation — the copy differs. */
  occasion: 'issued' | 'rotated'
  /** The key's or endpoint's operator-authored name. */
  subjectName: string
  secret: string
  prefix: string
}

export function SecretRevealDialog({
  request,
  onClose,
  t,
}: {
  request: RevealRequest | null
  onClose: () => void
  t: Translate
}) {
  const [acknowledged, setAcknowledged] = useState(false)
  const [copied, setCopied] = useState(false)
  const secretRef = useRef<HTMLInputElement | null>(null)
  const gateId = useId()
  const reasonId = `${gateId}-reason`

  /* A fresh reveal starts un-acknowledged. Keyed on the secret so a second
     rotation can never inherit the first one's tick. */
  useEffect(() => {
    setAcknowledged(false)
    setCopied(false)
  }, [request?.secret])

  if (request === null) return null

  const isKey = request.kind === 'api-key'
  const title = isKey
    ? request.occasion === 'rotated'
      ? t('admin.integrations.reveal.key.rotated.title')
      : t('admin.integrations.reveal.key.issued.title')
    : request.occasion === 'rotated'
      ? t('admin.integrations.reveal.webhook.rotated.title')
      : t('admin.integrations.reveal.webhook.issued.title')

  async function copy() {
    const input = secretRef.current
    try {
      await navigator.clipboard.writeText(request!.secret)
      setCopied(true)
    } catch {
      /* No clipboard permission — select the text so the operator can copy it
         themselves. A failure that leaves them with nothing to do would cost a
         rotation. */
      input?.focus()
      input?.select()
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        /* Closing is not a gesture here; it is the acknowledgement. */
        if (!next && acknowledged) onClose()
      }}
    >
      <DialogContent
        size="default"
        showCloseButton={false}
        onEscapeKeyDown={(event) => {
          if (!acknowledged) event.preventDefault()
        }}
        onInteractOutside={(event) => {
          if (!acknowledged) event.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-4 text-muted-foreground" aria-hidden="true" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {t('admin.integrations.reveal.subject', { name: request.subjectName })}
          </DialogDescription>
        </DialogHeader>

        {/* The consequence, ABOVE the secret. An operator who reads only the
            first thing in this dialog reads the thing that matters. */}
        <Banner
          role="alert"
          variant="card"
          banner={{
            id: 'admin-integrations-reveal-warning',
            tone: 'warning',
            title: isKey
              ? t('admin.integrations.reveal.warning.key.title')
              : t('admin.integrations.reveal.warning.webhook.title'),
            body: isKey
              ? t('admin.integrations.reveal.warning.key.body', { prefix: request.prefix })
              : t('admin.integrations.reveal.warning.webhook.body', { prefix: request.prefix }),
          }}
        />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${gateId}-secret`}>{t('admin.integrations.reveal.label')}</Label>
          <div className="flex items-center gap-2">
            {/* Read-only rather than disabled: a disabled input is not
                selectable, and selecting the text is the fallback when the
                clipboard is refused. */}
            <Input
              ref={secretRef}
              id={`${gateId}-secret`}
              type="text"
              readOnly
              dir="ltr"
              value={request.secret}
              onFocus={(event) => event.currentTarget.select()}
              className="flex-1 font-mono text-xs"
            />
            <Button size="xs" variant="secondary" onClick={() => void copy()}>
              {copied ? (
                <Check className="size-3.5" aria-hidden="true" />
              ) : (
                <Copy className="size-3.5" aria-hidden="true" />
              )}
              {/* §7.5 — the word changes, not only the glyph. */}
              {copied ? t('admin.integrations.reveal.copied') : t('admin.integrations.reveal.copy')}
            </Button>
          </div>
          <span className="text-xs text-muted-foreground">
            {t('admin.integrations.reveal.help')}
          </span>
        </div>

        {/* §4.3 — a boolean that gates a commit is a checkbox, never a switch. */}
        <div className="flex items-start gap-2">
          <Checkbox
            id={`${gateId}-ack`}
            checked={acknowledged}
            onCheckedChange={(value) => setAcknowledged(value === true)}
          />
          <Label htmlFor={`${gateId}-ack`} className="text-xs leading-5 font-normal">
            {isKey
              ? t('admin.integrations.reveal.ack.key')
              : t('admin.integrations.reveal.ack.webhook')}
          </Label>
        </div>

        <DialogFooter>
          <div className="flex flex-col items-end gap-1">
            <Button
              size="xs"
              disabled={!acknowledged}
              aria-describedby={acknowledged ? undefined : reasonId}
              onClick={onClose}
            >
              {t('admin.integrations.reveal.done')}
            </Button>
            {/* §11.2 — the refusal is real text beside the control, never a
                tooltip and never a hidden button. */}
            {!acknowledged && (
              <span id={reasonId} className="max-w-80 text-end text-xs text-muted-foreground">
                {t('admin.integrations.reveal.blocked')}
              </span>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
