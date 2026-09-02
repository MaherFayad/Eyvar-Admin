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
    {
      isEmpty: (value) => value.coverage.length === 0,
      /* Two reads behind one key. Both are `emails.templates.*`, so
         `invalidate('emails.templates.')` still clears this entry; saving a
         template goes through `refetch`, which bypasses the read. */
      cacheKey: 'emails.templates.list',
    },
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
        <CardTitle>{t('comms.template.title')}</CardTitle>
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
                {/* **H7 — the badge budget, and this header row spent it N
                    times over.** One chip per MISSING locale meant a template
                    short of two locales drew two amber fills, and the list drew
                    a wall of them. `globals.css`: *"a fifth chip in a row does
                    not add a fifth signal, it removes the first four."*
                    Clause 3 is the route out: **both branches become text in
                    the tone's own foreground** — `--ev-amber-dk` #7a3e12 at
                    8.32 : 1 on white, `--ev-green` #1d723c at 5.96 : 1. Same
                    five tones, same words, no plate, and the row's fill budget
                    goes to zero rather than to N.
                    `Complete` is demoted too, and deliberately: it is this
                    column's RESTING value, and `AssuranceScreen`'s D-21 ruling
                    is that a resting value drawn as a badge *"spends colour on
                    the rows that need none and flattens the ones that do"*.
                    H1/H3 — the template NAME is the identity of the row:
                    `--text-sm` at 500, not `--text-xs` at 600 (a step below the
                    body wearing a weight above its rank). */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{row.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{row.key}</span>
                  {row.missing.length === 0 ? (
                    <span className="text-xs text-success-foreground">
                      {t('comms.template.complete')}
                    </span>
                  ) : (
                    row.missing.map((locale) => (
                      <span key={locale} className="text-xs font-medium text-warning-foreground">
                        {t(MISSING_LABEL[locale])}
                      </span>
                    ))
                  )}
                </div>

                {row.missing.length > 0 && (
                  <p className="text-xs text-muted-foreground">{t('comms.template.missingHelp')}</p>
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
                        {/* H7 clause 1 — the sub-row carried TWO fills: a
                            neutral locale chip and the `In use` / `Draft`
                            status. A locale is a LABEL, not a lifecycle state
                            an operator can act on, so it is the one that goes;
                            the status keeps the row's single badge. H1 — the
                            locale is the identity of the sub-row and takes the
                            PRIMARY rank, the subject the DATA rank. */}
                        <div className="flex min-w-0 flex-wrap items-baseline gap-2">
                          <span className="shrink-0 text-sm font-medium text-foreground">
                            {t(LOCALE_LABEL[locale])}
                          </span>
                          <span className="truncate text-sm text-foreground">{template.subject}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {t('comms.template.version', { version: template.version })}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {t('comms.template.sends', { count: template.sendCount })}
                          </span>
                          <span className="text-xs text-muted-foreground">
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
