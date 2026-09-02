/**
 * Admin › Data & Compliance — retention schedules and the operational data
 * window.
 *
 * ## What was here
 *
 * `handleSaveRetention` was one line: `toast.success('Data retention schedules
 * updated')`. The two `Select`s above it wrote `useState` that nothing read, so
 * the value reverted on the next navigation and the operator was never told.
 *
 * Retention is *the setting most likely to be believed and least likely to be
 * checked*: nobody re-opens this card to confirm the number, and nothing else in
 * the product renders it, so a save that does not save is undetectable by
 * anyone until a regulator asks. That is the same class of defect as a stored
 * total disagreeing with its records — which is what the pane below this one is
 * for — so it is fixed rather than polished.
 *
 * It now reads and writes `clients/retention.ts`. `Last saved` renders the
 * server's stamp and the actor, so the save is **observable**: an operator can
 * see that the value they are looking at is the one that was written.
 *
 * ## The control is disabled, not hidden
 *
 * The save was behind `{canWrite && (…)}`. §11.2 asks for the opposite: a
 * blocked act is *disabled in place with a stated reason*. A hidden control
 * teaches an operator that the capability does not exist, so they stop asking
 * for it — and an absent button is invisible to a bug report as well.
 *
 * ## The values are a closed set
 *
 * Legacy takes a free number field and runs `parseInt(v,10) || 13` (`:20518`),
 * so `-5` is truthy, is stored, and turns the window boundary into a **future**
 * timestamp that marks every account in the book as an orphan (`16b` §12 item
 * 7). Three selects over three closed unions make that unrepresentable.
 *
 * Rules applied
 *   §11.2      disabled in place, with the reason. Also while nothing is dirty.
 *   §11.3      loading is a skeleton shaped like the form, never a spinner.
 *   R3         `Save schedules` is SECONDARY — the screen's primary is the
 *              integrity run.
 *   §9.1       logical utilities only.
 */

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Lock } from 'lucide-react'

import { getRetentionPolicy, saveRetentionPolicy } from '@/data/clients'
import type {
  AuditRetentionDays,
  OperationalWindowMonths,
  RetentionPolicy,
  TelemetryRetentionDays,
} from '@/data/types/retention'
import {
  AUDIT_RETENTION_OPTIONS,
  OPERATIONAL_WINDOW_OPTIONS,
  TELEMETRY_RETENTION_OPTIONS,
} from '@/data/types/retention'
import { formatDate } from '@/lib'
import { useAsync } from '@/hooks'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useShell } from '@/shell/ShellContext'
import { BlockedButton } from './BlockedButton'
import { withFallback } from '../../operations/localCopy'
import { ADMIN_DATA_EN } from './copy'

interface Draft {
  auditRetentionDays: AuditRetentionDays
  telemetryRetentionDays: TelemetryRetentionDays
  operationalWindowMonths: OperationalWindowMonths
}

export function RetentionCard() {
  const shell = useShell()
  /* AC-74 — the copy lives in `./copy.ts` and travels in this screen's
     own chunk. `withFallback` resolves a key the shell dictionary does
     not carry, so nothing here needs registering there. */
  const t = useMemo(
    /* **Memoised, and it is load-bearing.** `withFallback` returns a NEW
       function on every call, and several screens carry `t` in a `deps`
       array — so an unmemoised wrapper re-ran the fetch, which re-rendered,
       which rebuilt the wrapper. Two suites hung outright. */
    () => withFallback(shell.language.t, ADMIN_DATA_EN),
    [shell.language.t],
  )
  const { language } = shell.language
  const canWrite = shell.permissions.permissions.includes('manage_settings')

  /**
   * **Deliberately NOT cached (P3-13).** A save keeps the server's copy in
   * `saved`, local state that dies with the card - it does NOT `refetch`. So a
   * fresh mount within the TTL would read the warm PRE-save entry and show the
   * operator the policy they just replaced.
   *
   * Cacheable once the save either calls `refetch()` or invalidates
   * `'retention.'`.
   */
  const policy = useAsync<RetentionPolicy>((signal) => getRetentionPolicy(signal), { deps: [] })

  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  const [saved, setSaved] = useState<RetentionPolicy | null>(null)

  const server = saved ?? policy.data

  /* The draft is seeded from the server once it arrives and after each save, so
     `dirty` is a comparison against what is actually stored rather than against
     a hard-coded default. */
  useEffect(() => {
    if (server) {
      setDraft({
        auditRetentionDays: server.auditRetentionDays,
        telemetryRetentionDays: server.telemetryRetentionDays,
        operationalWindowMonths: server.operationalWindowMonths,
      })
    }
  }, [server])

  const dirty =
    server !== null &&
    draft !== null &&
    (draft.auditRetentionDays !== server.auditRetentionDays ||
      draft.telemetryRetentionDays !== server.telemetryRetentionDays ||
      draft.operationalWindowMonths !== server.operationalWindowMonths)

  const handleSave = async () => {
    if (!draft) return
    setSaving(true)
    setFailed(false)
    try {
      const next = await saveRetentionPolicy(draft)
      setSaved(next)
      toast.success(t('adminData.retention.saved'))
    } catch {
      setFailed(true)
      toast.error(t('adminData.retention.error'))
    } finally {
      setSaving(false)
    }
  }

  /* §11.2 — the reason, in priority order. A role that may not write is told
     that; an operator who has changed nothing is told that instead of being
     given a live button that would write the same values back. */
  const blockedReason = !canWrite
    ? t('adminData.retention.blocked')
    : !dirty
      ? t('adminData.retention.unchanged')
      : null

  return (
    <Card>
      <CardHeader className="border-b border-border pb-3">
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-muted-foreground" />
          {t('adminData.retention.title')}
        </CardTitle>
        <CardDescription className="max-w-2xl text-xs">
          {t('adminData.retention.desc')}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-4 text-xs">
        {policy.status === 'loading' && (
          <LoadingSkeleton pattern="P4" rows={3} label={t('adminData.retention.loading')} />
        )}

        {policy.status === 'error' && (
          <ErrorState
            scope="card"
            card={false}
            message={t('adminData.retention.error')}
            action={{ label: t('adminData.integrity.error.retry'), onClick: policy.refetch }}
          />
        )}

        {/* A settings record is a single object: `empty` and `content` are the
            same state, and `useAsync` reports `empty` only for a null payload —
            which for this resource would be a server fault, so it retries. */}
        {policy.status === 'empty' && (
          <ErrorState
            scope="card"
            card={false}
            message={t('adminData.retention.error')}
            action={{ label: t('adminData.integrity.error.retry'), onClick: policy.refetch }}
          />
        )}

        {policy.status === 'content' && draft !== null && server !== null && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 compact:grid-cols-1">
              <Field label={t('adminData.retention.audit')}>
                <Select
                  value={String(draft.auditRetentionDays)}
                  disabled={!canWrite || saving}
                  onValueChange={(v) =>
                    setDraft({ ...draft, auditRetentionDays: Number(v) as AuditRetentionDays })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AUDIT_RETENTION_OPTIONS.map((days) => (
                      <SelectItem key={days} value={String(days)}>
                        {t(`adminData.retention.days.${days}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label={t('adminData.retention.telemetry')}>
                <Select
                  value={String(draft.telemetryRetentionDays)}
                  disabled={!canWrite || saving}
                  onValueChange={(v) =>
                    setDraft({ ...draft, telemetryRetentionDays: Number(v) as TelemetryRetentionDays })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TELEMETRY_RETENTION_OPTIONS.map((days) => (
                      <SelectItem key={days} value={String(days)}>
                        {t(`adminData.retention.days.${days}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label={t('adminData.retention.window')}>
                <Select
                  value={String(draft.operationalWindowMonths)}
                  disabled={!canWrite || saving}
                  onValueChange={(v) =>
                    setDraft({
                      ...draft,
                      operationalWindowMonths: Number(v) as OperationalWindowMonths,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATIONAL_WINDOW_OPTIONS.map((months) => (
                      <SelectItem key={months} value={String(months)}>
                        {t(`adminData.retention.months.${months}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t('adminData.retention.window.help')}
                </p>
              </Field>
            </div>

            {failed && <p className="text-xs text-muted-foreground">{t('adminData.retention.error')}</p>}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                {server.updatedAt === null
                  ? t('adminData.retention.neverSaved')
                  : t('adminData.retention.lastSaved', {
                      when: formatDate(server.updatedAt, { style: 'day-month-time', language }),
                      who: server.updatedByUserName ?? server.updatedByUserId ?? '',
                    })}
              </span>
              <BlockedButton
                label={t('adminData.retention.save')}
                reason={blockedReason}
                disabled={saving}
                onClick={() => void handleSave()}
              >
                {saving ? t('adminData.retention.saving') : t('adminData.retention.save')}
              </BlockedButton>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="block font-medium text-foreground">{label}</span>
      {children}
    </label>
  )
}
