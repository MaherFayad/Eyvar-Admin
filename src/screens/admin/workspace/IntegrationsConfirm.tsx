/**
 * The Integrations confirmation — one dialog for the four acts that break a
 * live integration the moment they are pressed.
 *
 * | Act | Why it is confirmed | Primary |
 * |---|---|---|
 * | Rotate API key | the old credential dies **immediately**; there is no overlap window | ordinary |
 * | Revoke API key | terminal, and there is no un-revoke | **destructive** (R5a) |
 * | Rotate signing secret | every receiver verifying with the old secret starts failing | ordinary |
 * | Disable endpoint | stops delivery, but is one click to undo | ordinary |
 *
 * Enabling an endpoint is **not** confirmed, and neither is editing one: the
 * first is the undo of an act that was already confirmed, and the second ends
 * in a form with its own primary. A confirmation on every act trains the
 * operator to dismiss confirmations — `admin/team/ConfirmDialog.tsx` makes the
 * same argument about `resend` and `reinstate`, and it is the same argument.
 *
 * ## Rules applied
 *   R5a       the red primary is spent only on the unrecoverable. Revocation
 *             is the one act here that nothing on this pane walks back;
 *             rotation replaces a credential and disabling is reversible.
 *   §5.7      the primary repeats the verb. Never `OK`, never `Confirm`.
 *   §5.3      the body states the consequence AND what will not change — for a
 *             rotation, that the key keeps its id, its name and its scopes,
 *             which is the thing an operator is most likely to fear losing.
 *   §7.2      focus is trapped by `dialog.tsx` and `Escape` cancels; nothing
 *             mutates until the primary is pressed.
 */

import type { Translate } from '@/lib'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export interface IntegrationsConfirmRequest {
  title: string
  /** One sentence: the consequence, and what will NOT change. */
  body: string
  confirmLabel: string
  /** R5a — revocation only. */
  destructive?: boolean
  onConfirm: () => void
}

export function IntegrationsConfirm({
  request,
  busy,
  onClose,
  t,
}: {
  request: IntegrationsConfirmRequest | null
  busy: boolean
  onClose: () => void
  t: Translate
}) {
  if (request === null) return null
  return (
    <Dialog open onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{request.title}</DialogTitle>
          <DialogDescription>{request.body}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary" size="xs" disabled={busy} onClick={onClose}>
            {t('admin.integrations.cancel')}
          </Button>
          <Button
            size="xs"
            variant={request.destructive === true ? 'destructive' : 'default'}
            disabled={busy}
            onClick={request.onConfirm}
          >
            {request.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
