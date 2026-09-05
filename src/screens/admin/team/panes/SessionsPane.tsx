/**
 * Sessions & devices (D20 pane, TA-5): every live session across the roster,
 * ended one at a time under `manage_team`. The confirmation expands in the
 * row (§5.5); a refused control stays put with its reason (§11.2).
 */

import { useState } from 'react'
import { toast } from 'sonner'
import { isDeviceTrusted, listAllSessions, revokeOperatorSession } from '@/data/clients'
import { isApiError, type OperatorSession } from '@/data/types'
import { useAsync } from '@/hooks'
import { formatDate, type Language, type Translate } from '@/lib'
import { ErrorState } from '@/components/ErrorState'
import { InfoHint } from '@/components/InfoHint'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { roleLabel } from '@/screens/auth/copy'

export interface SessionsPaneProps {
  canWrite: boolean
  readOnlyReasonId: string
  t: Translate
  language: Language
}

export function SessionsPane({ canWrite, readOnlyReasonId, t, language }: SessionsPaneProps) {
  const sessions = useAsync<OperatorSession[]>((signal) => listAllSessions(signal), {
    cacheKey: 'team.sessions.all',
    isEmpty: (rows) => rows.length === 0,
  })
  const [confirming, setConfirming] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function end(row: OperatorSession) {
    setBusy(true)
    try {
      await revokeOperatorSession(row.user.id, row.device.id)
      setConfirming(null)
      toast.success(t('admin.team.toast.sessionRevoked'))
      sessions.refetch()
    } catch (thrown) {
      toast.error(t('admin.team.toast.failed', { reason: isApiError(thrown) ? thrown.message : t('admin.team.error') }))
    } finally {
      setBusy(false)
    }
  }

  const rows = sessions.data ?? []

  return (
    <Card>
      <CardHeader className="border-b border-border pb-3">
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            {t('admin.team.sessionsPane.title')}
            <InfoHint t={t}>{t('admin.team.sessionsPane.hint')}</InfoHint>
          </CardTitle>
          {sessions.status === 'content' && (
            <span className="text-xs tabular-nums text-muted-foreground">
              {t('admin.team.sessionsPane.count', { count: rows.length })}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {sessions.status === 'loading' ? (
          <div className="flex flex-col gap-2 p-3" aria-label={t('admin.team.sessions.loading')}>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : sessions.status === 'error' ? (
          <ErrorState
            scope="card"
            message={t('admin.team.sessions.error')}
            action={{ label: t('state.pageError.action'), onClick: sessions.refetch }}
          />
        ) : sessions.status === 'empty' ? (
          <p className="p-3 text-xs text-muted-foreground">{t('admin.team.sessionsPane.empty')}</p>
        ) : (
          <table className="w-full text-start text-xs">
            <thead className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
              <tr>
                <th scope="col" className="p-3 text-start">
                  {t('admin.team.column.operator')}
                </th>
                <th scope="col" className="p-3 text-start">
                  {t('admin.team.sessionsPane.column.device')}
                </th>
                <th scope="col" className="p-3 text-start">
                  {t('admin.team.sessionsPane.column.lastActive')}
                </th>
                <th scope="col" className="p-3 text-start">
                  {t('admin.team.sessionsPane.column.trust')}
                </th>
                <th scope="col" className="p-3 text-end">
                  <span className="sr-only">{t('admin.team.rowActions')}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => {
                const key = `${row.user.id}:${row.device.id}`
                const trusted = isDeviceTrusted(row.device)
                return (
                  <tr key={key} className="hover:bg-muted/20">
                    <td className="p-3">
                      <span className="flex flex-col">
                        <span className="font-semibold text-foreground">{row.user.name}</span>
                        <span className="text-muted-foreground">{roleLabel(t, row.user.role)}</span>
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="flex flex-col">
                        <span className="flex items-center gap-2 text-foreground">
                          {row.device.device}
                          {row.device.isCurrent && (
                            <StatusBadge tone="neutral">{t('admin.team.sessions.thisDevice')}</StatusBadge>
                          )}
                        </span>
                        <span className="text-muted-foreground">
                          {row.device.location} · <bdi dir="ltr">{row.device.ip}</bdi>
                        </span>
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {formatDate(row.device.lastActiveAt, { language, style: 'day-month-time' })}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {trusted && row.device.trustedUntil !== null
                        ? t('admin.team.sessions.trusted', {
                            date: formatDate(row.device.trustedUntil, { language }),
                          })
                        : t('admin.team.sessions.untrusted')}
                    </td>
                    <td className="p-3 text-end">
                      {confirming === key ? (
                        <span className="flex justify-end gap-1.5">
                          <Button size="xs" variant="destructive" disabled={busy} onClick={() => void end(row)}>
                            {t('admin.team.sessions.confirm')}
                          </Button>
                          <Button size="xs" variant="ghost" onClick={() => setConfirming(null)}>
                            {t('admin.team.sessions.cancel')}
                          </Button>
                        </span>
                      ) : (
                        <Button
                          size="xs"
                          variant="secondary"
                          disabled={!canWrite || busy}
                          aria-describedby={canWrite ? undefined : readOnlyReasonId}
                          onClick={() => setConfirming(key)}
                        >
                          {t('admin.team.sessionsPane.end')}
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  )
}
