/**
 * Transactional templates, grouped by the event that triggers them, with the
 * **locale gap made visible**.
 *
 * The grouping is the point. A template is identified by `(key, locale)`, so a
 * flat list of ten rows hides the only question worth asking here: *which
 * system event cannot mail an Arabic-speaking customer?* The client answers it
 * once, in `listEmailTemplateCoverage`, and this card renders the answer rather
 * than counting rows itself — a pane that derives coverage from a filtered page
 * reports a hole that is not there.
 *
 * A missing locale offers **no button**. Creating a template is not built, and
 * §11.2's "disabled in place with a reason" is for an action that exists and is
 * refused, not for one that has never existed — a permanently dead control is
 * worse than a stated gap.
 *
 * Four states, from one `useAsync` over both reads, so the card has one retry
 * rather than two that can disagree.
 */

import { useCallback, useMemo, useState } from 'react'
import { listEmailTemplateCoverage, listEmailTemplates } from '@/data/clients'
import type {
  EmailLocale,
  EmailTemplate,
  EmailTemplateCoverage,
} from '@/data/types/email'
import { formatDate, type Language, type Translate } from '@/lib'
import { useAsync } from '@/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { StatusBadge } from '@/components/StatusBadge'
import { TemplateEditorDialog } from './TemplateEditorDialog'

interface TemplatesData {
  coverage: EmailTemplateCoverage[]
  templates: EmailTemplate[]
}

const LOCALE_LABEL: Record<EmailLocale, string> = {
  en: 'comms.template.locale.en',
  ar: 'comms.template.locale.ar',
}

const MISSING_LABEL: Record<EmailLocale, string> = {
  en: 'comms.template.missing.en',
  ar: 'comms.template.missing.ar',
}

export interface EmailTemplatesCardProps {
  t: Translate
  language: Language
  actorId: string
  canWrite: boolean
}

export function EmailTemplatesCard({ t, language, actorId, canWrite }: EmailTemplatesCardProps) {
  const [editing, setEditing] = useState<EmailTemplate | null>(null)

  const data = useAsync<TemplatesData>(
    async (signal) => {
      const [coverage, page] = await Promise.all([
        listEmailTemplateCoverage(signal),
        listEmailTemplates({ pageSize: 100 }, signal),
      ])
      return { coverage, templates: page.items }
    },
    { isEmpty: (value) => value.coverage.length === 0 },
  )

  const byId = useMemo(() => {
    const map = new Map<string, EmailTemplate>()
    for (const template of data.data?.templates ?? []) map.set(template.id, template)
    return map
  }, [data.data])

  const { refetch } = data
  const onSaved = useCallback(() => {
    refetch()
  }, [refetch])

  return (
    <Card>
      <CardHeader className="border-b border-border pb-3">
        <CardTitle className="text-sm font-semibold">{t('comms.template.title')}</CardTitle>
        <CardDescription className="text-xs">{t('comms.template.desc')}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {data.status === 'loading' && (
          <div className="p-3">
            <LoadingSkeleton pattern="P4" rows={5} label={t('comms.template.title')} />
          </div>
        )}

        {data.status === 'error' && (
          <div className="p-3">
            <ErrorState
              scope="card"
              card={false}
              message={t('comms.template.error')}
              action={{ label: t('state.pageError.action'), onClick: data.refetch }}
            />
          </div>
        )}

        {data.status === 'empty' && (
          <EmptyState
            kind="first-run"
            card={false}
            illustration={null}
            heading={t('comms.template.empty.heading')}
            body={t('comms.template.empty.body')}
            actions={[]}
          />
        )}

        {data.status === 'content' && (
          <ul className="divide-y divide-border">
            {(data.data?.coverage ?? []).map((row) => (
              <li key={row.key} className="flex flex-col gap-2 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">{row.name}</span>
                  <span className="font-mono text-2xs text-muted-foreground">{row.key}</span>
                  {row.missing.length === 0 ? (
                    <StatusBadge tone="success">{t('comms.template.complete')}</StatusBadge>
                  ) : (
                    row.missing.map((locale) => (
                      <StatusBadge key={locale} tone="warning">
                        {t(MISSING_LABEL[locale])}
                      </StatusBadge>
                    ))
                  )}
                </div>

                {row.missing.length > 0 && (
                  <p className="text-2xs text-muted-foreground">{t('comms.template.missingHelp')}</p>
                )}

                <ul className="flex flex-col gap-1.5">
                  {row.present.map((locale) => {
                    const id = row.templateIds[locale]
                    const template = id === null ? undefined : byId.get(id)
                    if (!template) return null
                    return (
                      <li
                        key={template.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-2.5 py-2"
                      >
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <StatusBadge tone="neutral">{t(LOCALE_LABEL[locale])}</StatusBadge>
                          <span className="truncate text-xs text-foreground">{template.subject}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-2xs text-muted-foreground">
                            {t('comms.template.version', { version: template.version })}
                          </span>
                          <span className="text-2xs text-muted-foreground">
                            {t('comms.template.sends', { count: template.sendCount })}
                          </span>
                          <span className="text-2xs text-muted-foreground">
                            {t('comms.template.updated', {
                              date: formatDate(template.updatedAt, { language }),
                            })}
                          </span>
                          <StatusBadge tone={template.inUse ? 'info' : 'neutral'}>
                            {t(template.inUse ? 'comms.template.inUse' : 'comms.template.draft')}
                          </StatusBadge>
                          {/* Every operator may READ a template; only a writer
                              may change one. The editor itself refuses the save
                              in place, so the button opens either way. */}
                          <Button size="xs" variant="secondary" onClick={() => setEditing(template)}>
                            {canWrite ? t('comms.template.edit') : t('comms.template.preview')}
                          </Button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <TemplateEditorDialog
        template={editing}
        canWrite={canWrite}
        actorId={actorId}
        t={t}
        onClose={() => setEditing(null)}
        onSaved={onSaved}
      />
    </Card>
  )
}
