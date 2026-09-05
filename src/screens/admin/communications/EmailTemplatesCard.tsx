/**
 * Transactional templates as a master-detail: one row per system event on the
 * start side, with its language coverage stated in words (AC-C3); the selected
 * event's template edited in place on the end side, one language at a time.
 * Coverage comes from `listEmailTemplateCoverage`, never from counting rows.
 * A missing language is stated, not offered: creating a template is not built.
 */

import { useMemo, useState } from 'react'
import { InfoHint } from '@/components/InfoHint'
import { listEmailTemplateCoverage, listEmailTemplates } from '@/data/clients'
import type { EmailLocale, EmailTemplate, EmailTemplateCoverage } from '@/data/types/email'
import type { Language, Translate } from '@/lib'
import { useAsync } from '@/hooks'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { MasterDetailPage } from '@/components/PageShell'
import { TemplateEditor } from './TemplateEditor'

interface TemplatesData {
  coverage: EmailTemplateCoverage[]
  templates: EmailTemplate[]
}

const LOCALES: readonly EmailLocale[] = ['en', 'ar']

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

export function EmailTemplatesCard({ t, actorId, canWrite }: EmailTemplatesCardProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [locale, setLocale] = useState<EmailLocale>('en')

  const data = useAsync<TemplatesData>(
    async (signal) => {
      const [coverage, page] = await Promise.all([
        listEmailTemplateCoverage(signal),
        listEmailTemplates({ pageSize: 100 }, signal),
      ])
      return { coverage, templates: page.items }
    },
    {
      isEmpty: (value) => value.coverage.length === 0,
      /* Two reads behind one key; `invalidate('emails.templates.')` clears both. */
      cacheKey: 'emails.templates.list',
    },
  )

  const byId = useMemo(() => {
    const map = new Map<string, EmailTemplate>()
    for (const template of data.data?.templates ?? []) map.set(template.id, template)
    return map
  }, [data.data])

  const coverage = data.data?.coverage ?? []
  const family = coverage.find((row) => row.key === selectedKey) ?? coverage[0] ?? null
  /* A language the event has no template in falls back to one it has. */
  const shownLocale: EmailLocale | null =
    family === null ? null : family.present.includes(locale) ? locale : (family.present[0] ?? null)
  const templateId = family && shownLocale ? family.templateIds[shownLocale] : null
  const template = templateId ? byId.get(templateId) : undefined

  const list = (
    <Card className="self-start">
      <CardHeader className="border-b border-border pb-3">
        <CardTitle className="flex items-center gap-2">
          {t('comms.template.title')}
          <InfoHint t={t}>{t('comms.template.desc')}</InfoHint>
        </CardTitle>
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
          <ul aria-label={t('comms.template.title')} className="divide-y divide-border">
            {coverage.map((row) => {
              const active = family?.key === row.key
              return (
                <li key={row.key}>
                  <button
                    type="button"
                    aria-current={active ? 'true' : undefined}
                    className={cn(
                      'flex w-full flex-col gap-0.5 px-3 py-2 text-start text-xs hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                      active && 'bg-accent',
                    )}
                    onClick={() => setSelectedKey(row.key)}
                  >
                    <span className="text-sm font-medium text-foreground">{row.name}</span>
                    <span className="font-mono text-muted-foreground">{row.key}</span>
                    {/* H7: coverage in the tone's own ink, no plate. */}
                    {row.missing.length === 0 ? (
                      <span className="text-success-foreground">{t('comms.template.complete')}</span>
                    ) : (
                      row.missing.map((missing) => (
                        <span key={missing} className="font-medium text-warning-foreground">
                          {t(MISSING_LABEL[missing])}
                        </span>
                      ))
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )

  const detail =
    family === null ? null : (
      <Card>
        <CardHeader className="border-b border-border pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <CardTitle className="flex flex-wrap items-center gap-2">
                {family.name}
                <span className="font-mono text-xs font-normal text-muted-foreground">{family.key}</span>
              </CardTitle>
              {family.missing.length > 0 && (
                <p className="text-xs text-muted-foreground">{t('comms.template.missingHelp')}</p>
              )}
            </div>
            <ToggleGroup
              type="single"
              size="sm"
              variant="outline"
              value={shownLocale ?? undefined}
              aria-label={t('comms.template.language')}
              onValueChange={(value) => {
                if (value) setLocale(value as EmailLocale)
              }}
            >
              {LOCALES.map((each) => (
                <ToggleGroupItem key={each} value={each} disabled={!family.present.includes(each)}>
                  {t(LOCALE_LABEL[each])}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {template ? (
            <TemplateEditor
              key={template.id}
              template={template}
              canWrite={canWrite}
              actorId={actorId}
              t={t}
              onSaved={() => data.refetch()}
            />
          ) : (
            <p className="text-xs text-muted-foreground">{t('comms.template.missing.both')}</p>
          )}
        </CardContent>
      </Card>
    )

  return <MasterDetailPage list={list} detail={detail} />
}
