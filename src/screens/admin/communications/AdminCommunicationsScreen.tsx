/**
 * Admin › Communications — **P6-T2**, the emails pane, and the repair of what
 * was already on the screen.
 *
 * ## What this screen was
 *
 * A module-level `TEMPLATES` literal, a `broadcasts[]` array in component state
 * whose send invented `deliveredCount: 142`, three "gateway health" cards whose
 * every figure was written by hand, no `useAsync`, and therefore **none of the
 * four states**. It also ignored `row.views` entirely, although
 * `routeTable.ts:791` declares `inbox` and `outbox` on this sub-tab and records
 * that collapsing the old Email Log into those two views *"is what removes the
 * product's only four-deep path (§3.7)"*.
 *
 * ## What it is now
 *
 * Five cards, each reading through the seam and each carrying its own four
 * states, in the order an operator meets the questions:
 *
 *   1. **The email log**, carrying the sub-tab's `inbox` / `outbox` views. It
 *      leads because it is the only surface here that answers *"did the message
 *      go out"*, and because a page-level view control belongs near the top of
 *      the page it controls.
 *   2. **Sender identities** — what we send as, and what we may not.
 *   3. **Transactional templates** — what we send, per event, per language.
 *   4. **Push broadcasts** — the history, with counts from the record.
 *   5. **Notification templates** — the SMS / WhatsApp / push catalogue.
 *
 * ## Two removals, both deliberate
 *
 * **The gateway health strip is gone.** `180ms`, `99.8%`, `12.4k / 50k`,
 * `4,812 active tokens`, `99.9%` — every one of those was a literal in the
 * component, and provider health is modelled nowhere in the data layer.
 * Rendering an invented uptime figure to an operator is the same defect as
 * `deliveredCount: 142`, and fixing one while keeping the other would have been
 * an odd place to stop. Modelling provider health is a real task and it is
 * **reported, not silently invented here**.
 *
 * **`Date.now()` is gone** — it was minting broadcast ids in the component.
 * Ids come from the client, which mints them from a sequence rather than a
 * clock for the reasons `tickets.ts` sets out.
 *
 * ## The one primary (R3)
 *
 * `Send push broadcast`. It renders for every role and is **disabled in place
 * with its reason** for a role that cannot send (§11.2), rather than vanishing
 * — the previous screen hid it, which is how an operator learns their
 * permissions by their absence.
 */

import { useCallback, useMemo, useState } from 'react'
import type { SubTabRoute } from '@/data/types'
import type { PushBroadcast } from '@/data/types/email'
import { PageHeader } from '@/components/PageHeader'
import { SingleColumnPage } from '@/components/PageShell'
import { useShell } from '@/shell/ShellContext'
import { withCommsCopy } from './copy'
import { EmailLogCard } from './EmailLogCard'
import { EmailTemplatesCard } from './EmailTemplatesCard'
import { MessagingTemplatesCard } from './MessagingTemplatesCard'
import { PushBroadcastsCard } from './PushBroadcastsCard'
import { PushComposerModal } from './PushComposerModal'
import { SenderIdentitiesCard } from './SenderIdentitiesCard'

export function AdminCommunicationsScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  const { dir, language } = shell.language
  /* Memoised: `t` is a dependency of every card's `useMemo`/`useCallback`, and a
     translator rebuilt on each render invalidates all of them for nothing. */
  const t = useMemo(() => withCommsCopy(shell.language.t), [shell.language.t])

  const [composerOpen, setComposerOpen] = useState(false)
  const [broadcastToken, setBroadcastToken] = useState(0)
  const [totals, setTotals] = useState<{ total: number; attention: number } | null>(null)

  const canWrite = shell.permissions.permissions.includes('manage_settings')
  /* `session.userId` — never a constant in a component. */
  const actorId = shell.session?.userId ?? ''

  const onSent = useCallback((_broadcast: PushBroadcast) => {
    /* The record is already the client's; all this screen has to do is ask the
       history card to read it back. Nothing is pushed into local state, which
       is what let the old screen show a number no server ever produced. */
    setBroadcastToken((token) => token + 1)
  }, [])

  const onTotals = useCallback((next: { total: number; attention: number }) => {
    setTotals((current) =>
      current !== null && current.total === next.total && current.attention === next.attention
        ? current
        : next,
    )
  }, [])

  /* §8 — `meta` carries only what changes with the data on screen. Before the
     log has loaded there is nothing true to say, so it says nothing. */
  const meta =
    totals === null
      ? null
      : totals.total === 0
        ? t('comms.meta.empty')
        : t('comms.meta', { total: totals.total, attention: totals.attention })

  return (
    <SingleColumnPage
      header={
        <PageHeader
          title={t(row.titleKey)}
          meta={meta}
          primaryAction={{
            label: t('comms.push.compose'),
            onClick: () => setComposerOpen(true),
            disabled: !canWrite,
          }}
          t={t}
          dir={dir}
        />
      }
    >
      <div className="flex max-w-5xl flex-col gap-6">
        {/* §11.2 — the refusal that goes with the disabled primary, as text. */}
        {!canWrite && <p className="text-xs text-muted-foreground">{t('comms.push.blocked')}</p>}

        <EmailLogCard row={row} t={t} language={language} canWrite={canWrite} onTotals={onTotals} />

        <SenderIdentitiesCard t={t} language={language} actorId={actorId} canWrite={canWrite} />

        <EmailTemplatesCard t={t} language={language} actorId={actorId} canWrite={canWrite} />

        <PushBroadcastsCard t={t} language={language} reloadToken={broadcastToken} />

        <MessagingTemplatesCard t={t} />
      </div>

      <PushComposerModal
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onSent={onSent}
        t={t}
        language={language}
        actorId={actorId}
      />
    </SingleColumnPage>
  )
}
