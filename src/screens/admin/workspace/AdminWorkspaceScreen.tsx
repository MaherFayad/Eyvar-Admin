/**
 * Admin › Workspace — general, branding and legal, in one pane.
 *
 * ## What this screen used to be
 *
 * 231 lines in which **every field was a `useState` seeded with a string
 * literal** (`:18`–`:28`). No client, no `useAsync`, none of the four states,
 * and a save bar whose `onSave` was `setTimeout(…, 300)` — a fake latency that
 * made an unwired form feel wired. `Upload New Logo` (`:178`) had **no
 * `onClick` at all**, on the one screen the route table says exists to close
 * the two-logo-stores defect. `Queue Re-consent` (`:216`) was an inline
 * `toast.success` claiming an act that never happened.
 *
 * ## The logo button is wired, not refused
 *
 * Both legacy stores are gone and there is one `logo` field behind
 * `workspace.updateLogo`. The 200 KB cap — the one legacy actually enforced,
 * at `:7964` — lives in the client, so the file input is a convenience and not
 * the limit. The button opens a real `<input type="file">`; the input is
 * visually hidden but **focusable and labelled**, so the control is reachable
 * by keyboard rather than being a button that opens nothing.
 *
 * ## Re-consent states a number
 *
 * `queueReconsent` returns how many accounts were queued, derived from the
 * seeded `pendingConsentCount` the legacy code computes at `:3846`. Zero is a
 * legal answer and is refused in place with its reason rather than firing a
 * success toast about nobody.
 *
 * ## Rules applied
 *   R3         ONE primary, and it is **not** on this screen: a settings pane's
 *              commit is the shell save bar (§11.6 rows 5–9), so the header
 *              carries no primary at all.
 *   §11.2      `Upload logo`, `Remove logo` and each `Queue re-consent` render
 *              at all times, disabled with a stated reason when refused. The
 *              read-only case is one banner, not nine repeated sentences.
 *   §10.4      a 422 from the client lands under the field it names, with the
 *              1px border and the message. No fill — §6.2 D-14 is unsigned.
 *   §9.1       the Arabic wordmark field carries `dir="rtl"` because its
 *              CONTENT is Arabic regardless of the UI language; every other
 *              utility here is logical.
 *   §7.2       nothing removes an outline; the file input keeps its own ring.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  getWorkspaceSettings,
  queueReconsent,
  removeLogo,
  updateLogo,
  updateWorkspaceSettings,
} from '@/data/clients'
import type {
  LegalDocument,
  SubTabRoute,
  WorkspaceCurrency,
  WorkspaceSettings,
  WorkspaceTimezone,
} from '@/data/types'
import { isApiError, MAX_LOGO_BYTES } from '@/data/types'
import { useAsync } from '@/hooks'
import { formatDate } from '@/lib'
import { Banner } from '@/components/Banner'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { PageHeader } from '@/components/PageHeader'
import { SingleColumnPage } from '@/components/PageShell'
import { useShell } from '@/shell/ShellContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Building, Palette, ShieldCheck } from 'lucide-react'
import { IntegrationsSection } from './IntegrationsSection'

const TIMEZONES: readonly WorkspaceTimezone[] = ['Asia/Riyadh', 'Asia/Dubai', 'Europe/London']
const CURRENCIES: readonly WorkspaceCurrency[] = ['SAR', 'AED']
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml']

/** The one element every page-level refusal on this screen describes itself by. */
const READ_ONLY_REASON_ID = 'admin-workspace-read-only-reason'

/** `1 of 1024` rather than a raw byte count. Kilobytes only — the cap is 200 KB. */
function formatBytes(bytes: number): string {
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export function AdminWorkspaceScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  const { t, dir, language } = shell.language

  /* **D17.** `manage_settings` is retired — it was 39 of the console's 131
     guards, held by one person, and it split into four keys. General, branding,
     legal, communications and integrations are `manage_workspace`; this screen
     is the branding and legal half. Read-only branding is `◐` for the Ops
     Manager, which is one of D17's eight named widenings. */
  const canWrite = shell.permissions.permissions.includes('manage_workspace')

  const data = useAsync<WorkspaceSettings>((signal) => getWorkspaceSettings(signal))

  const [draft, setDraft] = useState<WorkspaceSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [logoBusy, setLogoBusy] = useState(false)
  const [queueing, setQueueing] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (data.data) setDraft(data.data)
  }, [data.data])

  /* The logo and the legal documents are NOT part of the dirty set: each has
     its own mutation and commits immediately. A save bar that claimed a logo
     upload was pending after it had already been stored would be the same lie
     the `setTimeout` was telling. */
  const dirty = useMemo(() => {
    if (draft === null || data.data === null) return false
    const keys = [
      'siteName',
      'siteDescription',
      'supportEmail',
      'supportPhone',
      'timezone',
      'currency',
      'brandNameEn',
      'brandNameAr',
    ] as const
    return keys.some((key) => draft[key] !== data.data?.[key])
  }, [draft, data.data])

  useEffect(() => {
    if (!dirty || !canWrite) {
      shell.setSaveBar(null)
      return
    }
    shell.setSaveBar({
      status: saving ? 'save-in-flight' : 'dirty',
      entity: t('admin.workspace.entity'),
      canSave: !saving,
      /* AC-52 — `canDiscard` is never gated on validity. */
      canDiscard: !saving,
      isSaving: saving,
      onSave: () => {
        void (async () => {
          if (draft === null) return
          setSaving(true)
          setFieldErrors({})
          try {
            await updateWorkspaceSettings({
              siteName: draft.siteName,
              siteDescription: draft.siteDescription,
              supportEmail: draft.supportEmail,
              supportPhone: draft.supportPhone,
              timezone: draft.timezone,
              currency: draft.currency,
              brandNameEn: draft.brandNameEn,
              brandNameAr: draft.brandNameAr,
            })
            data.refetch()
            toast.success(t('admin.workspace.saved'))
          } catch (thrown) {
            /* §10.4 — the message lands under the field the server named. A
               422 with `details[].field` is what makes that possible without
               the form inventing its own validation vocabulary. */
            if (isApiError(thrown) && thrown.details.length > 0) {
              setFieldErrors(
                Object.fromEntries(thrown.details.map((detail) => [detail.field, detail.message])),
              )
            } else {
              toast.error(t('admin.workspace.error'))
            }
          } finally {
            setSaving(false)
          }
        })()
      },
      onDiscard: () => {
        setDraft(data.data)
        setFieldErrors({})
        toast.info(t('admin.workspace.discarded'))
      },
    })
    return () => shell.setSaveBar(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, saving, canWrite, draft, data.data, t])

  function patch(next: Partial<WorkspaceSettings>) {
    setDraft((prev) => (prev === null ? prev : { ...prev, ...next }))
  }

  /* ── the logo, wired ─────────────────────────────────────────────────── */

  async function handleLogoFile(file: File) {
    if (!LOGO_TYPES.includes(file.type)) {
      toast.error(t('admin.workspace.logo.wrongType'))
      return
    }
    if (file.size > MAX_LOGO_BYTES) {
      /* Checked here so the operator hears about it before a round trip, and
         checked AGAIN in the client so a second surface cannot skip it. */
      toast.error(t('admin.workspace.logo.tooLarge', { size: formatBytes(file.size) }))
      return
    }
    setLogoBusy(true)
    try {
      const dataUrl = await readAsDataUrl(file)
      await updateLogo({ dataUrl, fileName: file.name, sizeBytes: file.size })
      data.refetch()
      toast.success(t('admin.workspace.logo.uploaded'))
    } catch (thrown) {
      toast.error(
        isApiError(thrown) && thrown.details[0]
          ? thrown.details[0].message
          : t('admin.workspace.error'),
      )
    } finally {
      setLogoBusy(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function handleRemoveLogo() {
    setLogoBusy(true)
    try {
      await removeLogo()
      data.refetch()
      toast.success(t('admin.workspace.logo.removed'))
    } finally {
      setLogoBusy(false)
    }
  }

  async function handleReconsent(document: LegalDocument) {
    setQueueing(document.key)
    try {
      const result = await queueReconsent(document.key)
      if (result.queued === 0) {
        toast.info(t('admin.workspace.legal.nothingToQueue'))
      } else {
        toast.success(t('admin.workspace.legal.queued', { count: result.queued }))
      }
      data.refetch()
    } catch {
      toast.error(t('admin.workspace.error'))
    } finally {
      setQueueing(null)
    }
  }

  const title = t(row.titleKey)
  const skeletonPattern = row.patterns[0] === 'SH' ? 'P1' : (row.patterns[0] ?? 'P4')

  /* An unset workspace is a real first-run: `getWorkspaceSettings` answers a
     record, so `useAsync`'s default emptiness check cannot see it. The screen
     names its own zero — no portal name means nothing has been configured. */
  const status =
    data.status === 'content' && (data.data?.siteName.trim() ?? '') === ''
      ? 'empty'
      : data.status

  const settings = draft
  const logo = data.data?.logo ?? null
  const readOnlyReason = canWrite ? null : t('admin.workspace.readOnly')

  const content = settings === null ? null : (
    <div className="flex max-w-4xl flex-col gap-6">
      {/* §11.2 — a page-level refusal is stated ONCE. Every control it refuses
          points `aria-describedby` HERE rather than repeating the sentence
          beside itself, which is how a legitimate rule turns into nine
          identical lines of noise the operator stops reading. */}
      {readOnlyReason !== null && (
        <div id={READ_ONLY_REASON_ID}>
          <Banner
            role="status"
            banner={{ id: 'admin-workspace-read-only', tone: 'info', title: readOnlyReason }}
          />
        </div>
      )}

      {/* ── 1. general ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="border-b border-border pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Building className="size-4 text-muted-foreground" aria-hidden="true" />
            {t('admin.workspace.general.title')}
          </CardTitle>
          <CardDescription className="text-xs">
            {t('admin.workspace.general.desc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-4 text-xs">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field
              id="admin-workspace-name"
              label={t('admin.workspace.siteName')}
              value={settings.siteName}
              error={fieldErrors['siteName'] ?? null}
              disabled={!canWrite}
              onChange={(value) => patch({ siteName: value })}
            />
            <Field
              id="admin-workspace-email"
              label={t('admin.workspace.supportEmail')}
              value={settings.supportEmail}
              type="email"
              error={fieldErrors['supportEmail'] ?? null}
              disabled={!canWrite}
              onChange={(value) => patch({ supportEmail: value })}
            />
            <Field
              id="admin-workspace-phone"
              label={t('admin.workspace.supportPhone')}
              value={settings.supportPhone}
              error={null}
              disabled={!canWrite}
              onChange={(value) => patch({ supportPhone: value })}
            />
            <Field
              id="admin-workspace-description"
              label={t('admin.workspace.siteDescription')}
              help={t('admin.workspace.siteDescriptionHelp')}
              value={settings.siteDescription}
              error={null}
              disabled={!canWrite}
              onChange={(value) => patch({ siteDescription: value })}
            />

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-workspace-tz">{t('admin.workspace.timezone')}</Label>
              <Select
                value={settings.timezone}
                disabled={!canWrite}
                onValueChange={(value) => patch({ timezone: value as WorkspaceTimezone })}
              >
                <SelectTrigger id="admin-workspace-tz">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((zone) => (
                    <SelectItem key={zone} value={zone}>
                      {t(`admin.workspace.tz.${zone}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-workspace-currency">{t('admin.workspace.currency')}</Label>
              <Select
                value={settings.currency}
                disabled={!canWrite}
                onValueChange={(value) => patch({ currency: value as WorkspaceCurrency })}
              >
                <SelectTrigger id="admin-workspace-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {t(`admin.workspace.currency.${code}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 2. branding, and the one logo ───────────────────────────────── */}
      <Card>
        <CardHeader className="border-b border-border pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Palette className="size-4 text-muted-foreground" aria-hidden="true" />
            {t('admin.workspace.branding.title')}
          </CardTitle>
          <CardDescription className="text-xs">
            {t('admin.workspace.branding.desc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-4 text-xs">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field
              id="admin-workspace-brand-en"
              label={t('admin.workspace.brandEn')}
              value={settings.brandNameEn}
              error={fieldErrors['brandNameEn'] ?? null}
              disabled={!canWrite}
              onChange={(value) => patch({ brandNameEn: value })}
            />
            {/* §9.1 — the CONTENT is Arabic whichever way the page reads. */}
            <Field
              id="admin-workspace-brand-ar"
              label={t('admin.workspace.brandAr')}
              value={settings.brandNameAr}
              error={null}
              disabled={!canWrite}
              inputDir="rtl"
              onChange={(value) => patch({ brandNameAr: value })}
            />
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-muted/20 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-foreground text-sm font-bold text-background"
                aria-hidden="true"
              >
                {logo?.dataUrl === null || logo === null ? (
                  settings.brandNameEn.slice(0, 2).toUpperCase()
                ) : (
                  <img
                    src={logo.dataUrl}
                    alt=""
                    className="size-full object-contain"
                  />
                )}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-semibold text-foreground">{t('admin.workspace.logo')}</span>
                <span className="truncate text-2xs text-muted-foreground">
                  {logo === null || logo.dataUrl === null || logo.fileName === null
                    ? t('admin.workspace.logo.none')
                    : t('admin.workspace.logo.meta', {
                        file: logo.fileName,
                        size: formatBytes(logo.sizeBytes ?? 0),
                      })}
                </span>
                <span className="text-2xs text-muted-foreground">
                  {t('admin.workspace.logo.help')}
                </span>
              </span>
            </div>

            {/* §11.2 — both controls render for every role; the refused one is
                disabled with the banner above stating why. */}
            <span className="flex shrink-0 flex-col items-end gap-1.5">
              <span className="flex items-center gap-1.5">
                <Button
                  size="xs"
                  disabled={!canWrite || logoBusy}
                  aria-describedby={canWrite ? undefined : READ_ONLY_REASON_ID}
                  onClick={() => fileInput.current?.click()}
                >
                  {logoBusy
                    ? t('admin.workspace.logo.uploading')
                    : logo?.dataUrl
                      ? t('admin.workspace.logo.replace')
                      : t('admin.workspace.logo.upload')}
                </Button>
                {logo?.dataUrl && (
                  <Button
                    size="xs"
                    variant="ghost"
                    disabled={!canWrite || logoBusy}
                    onClick={() => void handleRemoveLogo()}
                  >
                    {t('admin.workspace.logo.remove')}
                  </Button>
                )}
              </span>
              {/* Visually hidden but focusable and labelled: `sr-only` alone
                  would keep it in the tab order with no visible focus, so it is
                  taken out of the tab order and the BUTTON above is the control.
                  The button is a real `<button>` with its own ring. */}
              <input
                ref={fileInput}
                type="file"
                accept={LOGO_TYPES.join(',')}
                tabIndex={-1}
                aria-hidden="true"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void handleLogoFile(file)
                }}
              />
            </span>
          </div>

          <p className="text-2xs text-muted-foreground">{t('admin.workspace.logo.oneStore')}</p>
        </CardContent>
      </Card>

      {/* ── 3. legal & consent ──────────────────────────────────────────── */}
      <Card>
        <CardHeader className="border-b border-border pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="size-4 text-muted-foreground" aria-hidden="true" />
            {t('admin.workspace.legal.title')}
          </CardTitle>
          <CardDescription className="text-xs">{t('admin.workspace.legal.desc')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 pt-4 text-xs">
          {(data.data?.legalDocuments ?? []).map((document) => {
            /* Two kinds of refusal, and only ONE of them gets its own line:
               the permission refusal is already stated in the banner above, so
               the control points at that instead of restating it. */
            const domainRefusal =
              canWrite && document.pendingConsentCount === 0
                ? t('admin.workspace.legal.refusal.allCurrent')
                : null
            const refused = !canWrite || domainRefusal !== null
            const refusalId = `admin-workspace-legal-${document.key}-refusal`
            const describedBy = !canWrite
              ? READ_ONLY_REASON_ID
              : domainRefusal !== null
                ? refusalId
                : undefined
            return (
              <div
                key={document.key}
                className="flex items-start justify-between gap-4 rounded-lg border border-border bg-muted/20 p-3"
              >
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-medium text-foreground">{t(document.labelKey)}</span>
                  <span className="text-2xs text-muted-foreground">
                    {t('admin.workspace.legal.version', {
                      version: document.currentVersion,
                      date: formatDate(document.publishedOn, { language }),
                    })}
                  </span>
                  <span className="text-2xs text-muted-foreground">
                    {document.pendingConsentCount === 0
                      ? t('admin.workspace.legal.current')
                      : t('admin.workspace.legal.pending', {
                          count: document.pendingConsentCount,
                        })}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <Button
                    size="xs"
                    disabled={refused || queueing !== null}
                    aria-describedby={describedBy}
                    onClick={() => void handleReconsent(document)}
                  >
                    {queueing === document.key
                      ? t('admin.workspace.legal.queueing')
                      : t('admin.workspace.legal.queue')}
                  </Button>
                  {domainRefusal !== null && (
                    <span
                      id={refusalId}
                      className="max-w-56 text-end text-2xs text-muted-foreground"
                    >
                      {domainRefusal}
                    </span>
                  )}
                </span>
              </div>
            )
          })}
          <p className="text-2xs text-muted-foreground">
            {t('admin.workspace.legal.publishNote')}
          </p>
        </CardContent>
      </Card>

      {/* ── 4. integrations ─────────────────────────────────────────────── */}
      {/* **D20** — API keys and webhooks ship as a pane on THIS sub-tab. There
          is no eighth Admin sub-tab and the count stays 35, so this is a
          section of the existing row rather than a route. Its three cards each
          read their own client and carry their own four states; nothing here
          is part of the save bar's dirty set, because every act in it commits
          immediately and a save bar claiming a revoked key was still pending
          would be the same lie the old `setTimeout` was telling. */}
      <IntegrationsSection
        t={t}
        language={language}
        canWrite={canWrite}
        held={shell.permissions.permissions}
      />
    </div>
  )

  /* ── the four states, in order ──────────────────────────────────────── */
  const body =
    status === 'loading' ? (
      <LoadingSkeleton pattern={skeletonPattern} />
    ) : status === 'error' ? (
      <ErrorState
        scope="page"
        heading={t('state.pageError.title', { resource: title })}
        message={t('admin.workspace.error')}
        action={{ label: t('state.pageError.action'), onClick: data.refetch }}
      />
    ) : status === 'empty' ? (
      <EmptyState
        kind="first-run"
        heading={t('admin.workspace.empty.heading')}
        body={t('admin.workspace.empty.body')}
        actions={[
          { label: t('admin.workspace.empty.action'), primary: true, onClick: data.refetch },
        ]}
      />
    ) : (
      content
    )

  return (
    <SingleColumnPage
      header={
        <PageHeader
          title={title}
          meta={
            data.data?.updatedAt
              ? t('admin.workspace.legal.version', {
                  version: data.data.siteName,
                  date: formatDate(data.data.updatedAt, { language }),
                })
              : null
          }
          /* R3 — no primary. A settings pane commits through the shell save
             bar, and a header primary beside it would be a second one. */
          t={t}
          dir={dir}
        />
      }
    >
      {body}
    </SingleColumnPage>
  )
}

/**
 * One text field, with §10.4's invalid treatment: a 1px `--ev-red` border from
 * `input.tsx`'s own `aria-invalid` rule, and the message beneath. **No fill** —
 * §6.2 D-14 clause B is unsigned and `--ev-red-lt` belongs to the critical
 * banner, so this file does not add a fourth opinion to the three that already
 * disagree.
 */
function Field({
  id,
  label,
  value,
  error,
  disabled,
  help,
  type,
  inputDir,
  onChange,
}: {
  id: string
  label: string
  value: string
  error: string | null
  disabled: boolean
  help?: string
  type?: string
  inputDir?: 'rtl' | 'ltr'
  onChange: (value: string) => void
}) {
  const describedBy = error !== null ? `${id}-error` : help !== undefined ? `${id}-help` : undefined
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        dir={inputDir}
        disabled={disabled}
        aria-invalid={error !== null}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
      />
      {error !== null ? (
        <span id={`${id}-error`} className="text-2xs text-destructive">
          {error}
        </span>
      ) : help !== undefined ? (
        <span id={`${id}-help`} className="text-2xs text-muted-foreground">
          {help}
        </span>
      ) : null}
    </div>
  )
}

/** `FileReader` as a promise. The only host API this screen touches. */
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('The file could not be read.'))
    reader.readAsDataURL(file)
  })
}
