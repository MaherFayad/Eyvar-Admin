/**
 * Sender identities — the addresses the system may send as.
 *
 * Two rules carry this card:
 *
 * **§11.2 — an unverified identity is refused in place, with the reason.**
 * `Make default` renders on every row, always. On a row that cannot send it is
 * disabled and the sentence sits **beside it as real text, not in a tooltip**,
 * because a refusal an operator has to hover to discover is a refusal they will
 * meet at the click instead. The predicate is not re-derived here: the client
 * sends `canSend` and `blockedFor`, and this card renders them.
 *
 * **Exactly one default.** The card never toggles a row locally; it calls
 * `setDefaultSenderIdentity`, which returns the whole set, because two rows
 * change and a local optimistic flip would show two defaults for a beat.
 *
 * All four states: skeleton, card-scoped error with a retry, a first-run empty
 * that names what a sender identity is for, and the list.
 */

import { useCallback, useState } from 'react'
import { InfoHint } from '@/components/InfoHint'
import { toast } from 'sonner'
import { listSenderIdentities, requestSenderVerification, setDefaultSenderIdentity } from '@/data/clients'
import type { Paginated } from '@/data/types'
import type { SenderIdentity } from '@/data/types/email'
import { formatDate, type Language, type Translate } from '@/lib'
import { useAsync } from '@/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { StatusBadge } from '@/components/StatusBadge'
import type { BadgeTone } from '@/data/types'

/** R7's five tones. `failed` is `warning`, not red — R5a permits red in four places and this is none of them. */
const VERIFICATION_TONE: Record<SenderIdentity['verification'], BadgeTone> = {
  verified: 'success',
  pending: 'info',
  unverified: 'neutral',
  failed: 'warning',
}

const VERIFICATION_LABEL: Record<SenderIdentity['verification'], string> = {
  verified: 'comms.verify.verified',
  pending: 'comms.verify.pending',
  unverified: 'comms.verify.unverified',
  failed: 'comms.verify.failed',
}

/** One sentence per `SenderBlockReason`. No sentence is assembled from two. */
const BLOCKED_COPY: Record<NonNullable<SenderIdentity['blockedFor']>, string> = {
  unverified: 'comms.identity.blocked.unverified',
  'verification-pending': 'comms.identity.blocked.pending',
  'verification-failed': 'comms.identity.blocked.failed',
}

export interface SenderIdentitiesCardProps {
  t: Translate
  language: Language
  /** The acting operator, recorded on the identity as `updatedBy`. */
  actorId: string
  canWrite: boolean
}

export function SenderIdentitiesCard({ t, language, actorId, canWrite }: SenderIdentitiesCardProps) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const data = useAsync<Paginated<SenderIdentity>>((signal) => listSenderIdentities({ pageSize: 50 }, signal), {
    cacheKey: 'emails.identities.list',
  })

  const { refetch } = data

  const makeDefault = useCallback(
    async (identity: SenderIdentity) => {
      setBusyId(identity.id)
      try {
        await setDefaultSenderIdentity(identity.id, actorId)
        toast.success(t('comms.toast.defaultSet', { address: identity.address }))
        refetch()
      } catch {
        toast.error(t('comms.toast.defaultFailed'))
      } finally {
        setBusyId(null)
      }
    },
    [actorId, refetch, t],
  )

  const verify = useCallback(
    async (identity: SenderIdentity) => {
      setBusyId(identity.id)
      try {
        await requestSenderVerification(identity.id, actorId)
        toast.success(t('comms.toast.verifyRequested', { address: identity.address }))
        refetch()
      } catch {
        toast.error(t('comms.toast.verifyFailed'))
      } finally {
        setBusyId(null)
      }
    },
    [actorId, refetch, t],
  )

  return (
    <Card>
      <CardHeader className="border-b border-border pb-3">
        <CardTitle>{t('comms.identity.title')}
        <InfoHint t={t}>{t('comms.identity.desc')}</InfoHint>
      </CardTitle>
        </CardHeader>
      <CardContent className="p-0">
        {data.status === 'loading' && (
          <div className="p-3">
            <LoadingSkeleton pattern="P4" rows={4} label={t('comms.identity.title')} />
          </div>
        )}

        {data.status === 'error' && (
          <div className="p-3">
            <ErrorState
              scope="card"
              card={false}
              message={t('comms.identity.error')}
              action={{ label: t('state.pageError.action'), onClick: data.refetch }}
            />
          </div>
        )}

        {data.status === 'empty' && (
          <EmptyState
            kind="first-run"
            card={false}
            illustration={null}
            heading={t('comms.identity.empty.heading')}
            body={t('comms.identity.empty.body')}
            actions={[]}
          />
        )}

        {data.status === 'content' && (
          <ul className="divide-y divide-border">
            {(data.data?.items ?? []).map((identity) => {
              const blocked = identity.blockedFor
              /* §11.2 — the control renders on every row. What changes is
                 whether it is disabled and what sentence sits beside it. */
              const defaultRefusal = !canWrite
                ? t('comms.identity.blocked.permission')
                : identity.isDefault
                  ? t('comms.identity.blocked.alreadyDefault')
                  : blocked
                    ? t(BLOCKED_COPY[blocked])
                    : null
              const canVerify =
                identity.verification === 'unverified' || identity.verification === 'failed'
              const verifyRefusal = !canWrite
                ? t('comms.identity.blocked.permission')
                : identity.verification === 'pending'
                  ? t('comms.identity.verifyRunning')
                  : identity.verification === 'verified'
                    ? t('comms.identity.verifyDone')
                    : null

              return (
                <li key={identity.id} className="flex flex-wrap items-start justify-between gap-3 p-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">{identity.displayName}</span>
                      <span className="font-mono text-xs text-muted-foreground">{identity.address}</span>
                      <StatusBadge tone={VERIFICATION_TONE[identity.verification]}>
                        {t(VERIFICATION_LABEL[identity.verification])}
                      </StatusBadge>
                      {identity.isDefault && (
                        <StatusBadge tone="info">{t('comms.identity.default')}</StatusBadge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {identity.replyTo === null
                        ? t('comms.identity.replyToSelf')
                        : t('comms.identity.replyTo', { address: identity.replyTo })}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {identity.verifiedAt !== null
                        ? t('comms.identity.verifiedOn', {
                            date: formatDate(identity.verifiedAt, { language }),
                          })
                        : identity.verificationRequestedAt !== null
                          ? t('comms.identity.requestedOn', {
                              date: formatDate(identity.verificationRequestedAt, { language }),
                            })
                          : t('comms.identity.neverRequested')}
                    </span>
                    {/* The refusal, as real text under the row it applies to
                        (§8.4.4). Never a tooltip, never a hidden control. */}
                    {defaultRefusal !== null && !identity.isDefault && (
                      <span className="text-xs text-muted-foreground">{defaultRefusal}</span>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      size="xs"
                      variant="secondary"
                      disabled={!canWrite || !canVerify || busyId === identity.id}
                      onClick={() => void verify(identity)}
                    >
                      {identity.verification === 'failed'
                        ? t('comms.identity.verifyAgain')
                        : t('comms.identity.verify')}
                    </Button>
                    <Button
                      size="xs"
                      variant="secondary"
                      disabled={defaultRefusal !== null || busyId === identity.id}
                      onClick={() => void makeDefault(identity)}
                    >
                      {t('comms.identity.makeDefault')}
                    </Button>
                  </div>
                  {verifyRefusal !== null && canVerify && (
                    <span className="w-full text-xs text-muted-foreground">{verifyRefusal}</span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
