/**
 * API keys — issue, scope, rotate, revoke, with the usage record D20 asks for.
 *
 * ## What a row can and cannot show
 *
 * **A row shows the prefix and never a secret**, because there is no secret to
 * show: `data/types/integrations.ts` rules AC-951's re-read clause by leaving
 * `ApiKey` no field for one. There is deliberately **no `Show`, `Reveal` or
 * `Copy key` action in this table** — not a disabled one, not a
 * permission-gated one. §11.2's *"disabled in place with a reason"* is for an
 * act the operator could take with different authority; this one cannot be
 * taken by anybody, and rendering it would teach exactly the thing the model
 * exists to make false.
 *
 * The two actions offered are the two AC-951 names: **rotate** and **revoke**.
 * Rotation is not a hygiene ritual here — it is the answer to *"the integration
 * lost its key"*, and the copy says so.
 *
 * ## The four states
 *
 * `DataTable` owns all four. `firstRun` is the workspace with no keys at all;
 * `noMatch` is a filtered zero; the error state retries the read. The seed
 * carries a never-used key, a rotated key and a revoked key so none of the
 * interesting rows needs a fixture edit to reach (`seam.test.ts`).
 *
 * ## Rules applied
 *   R3         the card action is `secondary` — `ReasonCodesCard`'s precedent.
 *              The one `default` primary of this act lives in the dialog.
 *   R5a        no red on a row. `revoked` is a NEUTRAL badge: a terminal
 *              factual outcome, not an alarm (V-07). Red is spent once, on the
 *              revoke confirmation's primary.
 *   R7         four of the five tones, each paired with a word (§7.5).
 *   §11.2      both row actions render on every row and are disabled in place
 *              with a sentence naming the next move.
 *   §7.3       row actions come from `DataTable`, which reveals them on hover
 *              **or focus-within**.
 *   D25        no bulk command is declared, so no checkbox column is rendered.
 *   §9.1       the prefix is `dir="ltr"` — its CONTENT is a Latin token
 *              whichever way the page reads. Every utility is logical.
 */

import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { issueApiKey, listApiKeys, revokeApiKey, rotateApiKey } from '@/data/clients'
import type { BadgeTone, Paginated, PermissionKey } from '@/data/types'
import { isApiError } from '@/data/types'
import { API_KEY_STATES, type ApiKey, type ApiKeyState } from '@/data/types/integrations'
import { useAsync, useIndexTable } from '@/hooks'
import { formatDate, type Language, type Translate } from '@/lib'
import { DataTable, type DataColumn } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { IssueApiKeyDialog, scopeLabelKey } from './IssueApiKeyDialog'
import { IntegrationsConfirm, type IntegrationsConfirmRequest } from './IntegrationsConfirm'
import type { RevealRequest } from './SecretRevealDialog'

/** R7, and **no red** — a revoked key is `Archived`-shaped, not an alarm (R5a, V-07). */
const STATE_TONE: Record<ApiKeyState, BadgeTone> = {
  active: 'success',
  revoked: 'neutral',
}

const STATE_LABEL: Record<ApiKeyState, string> = {
  active: 'admin.integrations.key.state.active',
  revoked: 'admin.integrations.key.state.revoked',
}

export function ApiKeysCard({
  t,
  language,
  canWrite,
  held,
  onReveal,
}: {
  t: Translate
  language: Language
  canWrite: boolean
  /** The signed-in operator's own permissions — the ceiling on what a key may carry. */
  held: readonly PermissionKey[]
  /** Hands the freshly minted secret to the one-time reveal surface. */
  onReveal: (request: RevealRequest) => void
}) {
  const table = useIndexTable<ApiKey>({
    mode: 'queue',
    getRowId: (key) => key.id,
    /* Its own namespace: this table shares a route with four other panes, and
       an unnamespaced `?q=` would be read by whichever of them looked first. */
    urlKey: 'keys',
  })

  const data = useAsync<Paginated<ApiKey>>((signal) => listApiKeys(table.params, signal), {
    deps: [table.params],
  })
  const { refetch } = data

  const [issuing, setIssuing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [confirm, setConfirm] = useState<IntegrationsConfirmRequest | null>(null)

  const issue = useCallback(
    async (input: { name: string; scopes: PermissionKey[] }) => {
      setBusy(true)
      setFieldErrors({})
      try {
        const result = await issueApiKey(input)
        setIssuing(false)
        refetch()
        /* The secret goes straight to the reveal surface and nowhere else. It
           is never put in component state that outlives the dialog, never in a
           toast, and never in the row. */
        onReveal({
          kind: 'api-key',
          occasion: 'issued',
          subjectName: result.key.name,
          secret: result.issued.secret,
          prefix: result.issued.prefix,
        })
      } catch (thrown) {
        if (isApiError(thrown) && thrown.details.length > 0) {
          setFieldErrors(
            Object.fromEntries(thrown.details.map((detail) => [detail.field, detail.message])),
          )
        } else {
          toast.error(t('admin.integrations.key.issue.failed'))
        }
      } finally {
        setBusy(false)
      }
    },
    [onReveal, refetch, t],
  )

  const rotate = useCallback(
    async (key: ApiKey) => {
      setBusy(true)
      try {
        const result = await rotateApiKey(key.id)
        setConfirm(null)
        refetch()
        onReveal({
          kind: 'api-key',
          occasion: 'rotated',
          subjectName: result.key.name,
          secret: result.issued.secret,
          prefix: result.issued.prefix,
        })
      } catch {
        toast.error(t('admin.integrations.key.rotate.failed'))
      } finally {
        setBusy(false)
      }
    },
    [onReveal, refetch, t],
  )

  const revoke = useCallback(
    async (key: ApiKey) => {
      setBusy(true)
      try {
        await revokeApiKey(key.id)
        setConfirm(null)
        refetch()
        toast.success(t('admin.integrations.key.revoke.done', { name: key.name }))
      } catch {
        toast.error(t('admin.integrations.key.revoke.failed'))
      } finally {
        setBusy(false)
      }
    },
    [refetch, t],
  )

  const columns: DataColumn<ApiKey>[] = useMemo(
    () => [
      {
        id: 'name',
        header: t('admin.integrations.key.col.name'),
        minWidth: 180,
        dataType: 'text',
        sortField: 'name',
        cell: (key) => (
          <span className="text-xs font-semibold text-foreground">{key.name}</span>
        ),
        secondaryLine: (key) => key.prefix,
      },
      {
        id: 'scopes',
        header: t('admin.integrations.key.col.scopes'),
        width: 200,
        dataType: 'text',
        cell: (key) => (
          <span className="flex flex-wrap gap-1">
            {key.scopes.map((scope) => (
              <span
                key={scope}
                className="rounded-md border border-border px-1.5 py-0.5 text-2xs text-muted-foreground"
              >
                {t(scopeLabelKey(scope))}
              </span>
            ))}
          </span>
        ),
      },
      {
        id: 'state',
        header: t('admin.integrations.key.col.state'),
        width: 130,
        dataType: 'enum',
        filter: {
          kind: 'select',
          field: 'state',
          label: t('admin.integrations.key.filter.state'),
          options: API_KEY_STATES.map((state) => ({ value: state, label: t(STATE_LABEL[state]) })),
        },
        cell: (key) => (
          <div className="flex flex-col gap-0.5">
            <StatusBadge tone={STATE_TONE[key.state]}>{t(STATE_LABEL[key.state])}</StatusBadge>
            {key.rotatedAt !== null && key.state === 'active' && (
              <span className="text-2xs text-muted-foreground">
                {t('admin.integrations.key.rotatedOn', {
                  date: formatDate(key.rotatedAt, { language }),
                })}
              </span>
            )}
          </div>
        ),
      },
      {
        id: 'lastUsedAt',
        header: t('admin.integrations.key.col.lastUsed'),
        width: 150,
        dataType: 'date',
        sortField: 'lastUsedAt',
        cell: (key) =>
          key.lastUsedAt === null ? (
            /* `Never used` and `—` are different facts and this column refuses
               to render them the same way. */
            <span className="text-2xs text-muted-foreground">
              {t('admin.integrations.key.neverUsed')}
            </span>
          ) : (
            <div className="flex flex-col gap-0.5">
              <span className="text-2xs text-foreground">
                {formatDate(key.lastUsedAt, { language, style: 'day-month-time' })}
              </span>
              <span className="text-2xs text-muted-foreground">
                {t('admin.integrations.key.requests', { count: key.requestCount })}
              </span>
            </div>
          ),
      },
      {
        id: 'createdAt',
        header: t('admin.integrations.key.col.created'),
        width: 110,
        dataType: 'date',
        sortField: 'createdAt',
        cell: (key) => (
          <span className="text-2xs text-muted-foreground">
            {formatDate(key.createdAt, { language })}
          </span>
        ),
      },
    ],
    [language, t],
  )

  return (
    <section aria-label={t('admin.integrations.key.title')} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            {t('admin.integrations.key.title')}
          </h2>
          <p className="max-w-2xl text-xs text-muted-foreground">
            {t('admin.integrations.key.desc')}
          </p>
        </div>
        {/* §11.2 — the control renders for every role and states its refusal,
            rather than vanishing for the role that cannot use it. */}
        <div className="flex flex-col items-end gap-1">
          <Button
            size="xs"
            variant="secondary"
            disabled={!canWrite}
            aria-describedby={canWrite ? undefined : 'admin-integrations-keys-blocked'}
            onClick={() => setIssuing(true)}
          >
            {t('admin.integrations.key.issue')}
          </Button>
          {!canWrite && (
            <span id="admin-integrations-keys-blocked" className="text-2xs text-muted-foreground">
              {t('admin.integrations.readOnly')}
            </span>
          )}
        </div>
      </div>

      <DataTable
        table={table}
        rows={data.data?.items ?? []}
        columns={columns}
        getRowId={(key) => key.id}
        status={data.status}
        total={data.data?.total ?? 0}
        t={t}
        language={language}
        tableId="admin-workspace-api-keys"
        searchPlaceholder={t('admin.integrations.key.search')}
        skeletonPattern="P1"
        rowActions={[
          {
            label: t('admin.integrations.key.rotate'),
            onSelect: (key) =>
              setConfirm({
                title: t('admin.integrations.key.rotate.confirm.title'),
                body: t('admin.integrations.key.rotate.confirm.body', { name: key.name }),
                confirmLabel: t('admin.integrations.key.rotate'),
                onConfirm: () => void rotate(key),
              }),
            disabled: (key) => !canWrite || key.state === 'revoked' || busy,
            reason: (key) => keyActionRefusal(key, canWrite, t),
          },
          {
            label: t('admin.integrations.key.revoke'),
            onSelect: (key) =>
              setConfirm({
                title: t('admin.integrations.key.revoke.confirm.title'),
                body: t('admin.integrations.key.revoke.confirm.body', { name: key.name }),
                confirmLabel: t('admin.integrations.key.revoke'),
                /* R5a use #1 — the one act on this pane nothing walks back. */
                destructive: true,
                onConfirm: () => void revoke(key),
              }),
            disabled: (key) => !canWrite || key.state === 'revoked' || busy,
            reason: (key) => keyActionRefusal(key, canWrite, t),
          },
        ]}
        firstRun={{
          heading: t('admin.integrations.key.empty.heading'),
          body: t('admin.integrations.key.empty.body'),
          actions: canWrite
            ? [
                {
                  label: t('admin.integrations.key.issue'),
                  primary: true,
                  onClick: () => setIssuing(true),
                },
              ]
            : [],
        }}
        noMatch={{ message: t('admin.integrations.key.noMatch') }}
        error={{ message: t('admin.integrations.key.error'), onRetry: data.refetch }}
      />

      <IssueApiKeyDialog
        open={issuing}
        held={held}
        busy={busy}
        serverErrors={fieldErrors}
        onSubmit={(input) => void issue(input)}
        onClose={() => {
          setIssuing(false)
          setFieldErrors({})
        }}
        t={t}
      />

      <IntegrationsConfirm
        request={confirm}
        busy={busy}
        onClose={() => setConfirm(null)}
        t={t}
      />
    </section>
  )
}

/**
 * The sentence beside a refused action. `null` only where the action is
 * allowed — every refusal owes the operator a next move.
 */
function keyActionRefusal(key: ApiKey, canWrite: boolean, t: Translate): string | null {
  if (!canWrite) return t('admin.integrations.readOnly')
  if (key.state === 'revoked') return t('admin.integrations.key.refusal.revoked')
  return null
}
