/**
 * One template edited in place (AC-C4 to AC-C6). The preview renders the
 * template with each variable's sample, not the source. Validation is the same
 * function the save runs, and an undeclared variable blocks the save in place
 * with the fix beside it (§11.2). A live template asks once before it saves.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { emailTemplateIssues, renderEmailPreview, saveEmailTemplate } from '@/data/clients'
import type { EmailTemplate, EmailTemplateDraft, EmailTemplateIssue, EmailTemplateVariable } from '@/data/types/email'
import type { Translate } from '@/lib'
import { Banner } from '@/components/Banner'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export interface TemplateEditorProps {
  template: EmailTemplate
  canWrite: boolean
  actorId: string
  t: Translate
  onSaved: (saved: EmailTemplate) => void
}

export function TemplateEditor({ template, canWrite, actorId, t, onSaved }: TemplateEditorProps) {
  const [subject, setSubject] = useState(template.subject)
  const [body, setBody] = useState(template.body)
  const [variables, setVariables] = useState<EmailTemplateVariable[]>(template.variables.map((v) => ({ ...v })))
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)

  /* The draft is seeded from the template it edits and never carried to another. */
  useEffect(() => {
    setSubject(template.subject)
    setBody(template.body)
    setVariables(template.variables.map((v) => ({ ...v })))
    setConfirming(false)
    setSaving(false)
    setFailed(false)
  }, [template])

  const draft: EmailTemplateDraft = useMemo(() => ({ subject, body, variables }), [subject, body, variables])
  const dirty =
    subject !== template.subject ||
    body !== template.body ||
    variables.length !== template.variables.length ||
    variables.some((v, i) => v.name !== template.variables[i]?.name)
  const validation = useMemo(() => emailTemplateIssues(draft, { inUse: template.inUse }), [draft, template])
  const preview = useMemo(() => renderEmailPreview(template, draft), [template, draft])

  const declare = useCallback((name: string) => {
    setVariables((current) =>
      current.some((v) => v.name === name) ? current : [...current, { name, required: true, sample: name }],
    )
  }, [])

  const commit = useCallback(async () => {
    setSaving(true)
    setFailed(false)
    try {
      const saved = await saveEmailTemplate(template.id, draft, { confirmInUse: true, actorId })
      toast.success(t('comms.toast.templateSaved', { name: saved.name, version: saved.version }))
      onSaved(saved)
    } catch {
      setFailed(true)
    } finally {
      setSaving(false)
      setConfirming(false)
    }
  }, [actorId, draft, onSaved, t, template])

  const onSave = useCallback(() => {
    if (template.inUse && !confirming) {
      setConfirming(true)
      return
    }
    void commit()
  }, [commit, confirming, template])

  const blockedReason = !canWrite ? t('comms.editor.readOnly') : validation.valid ? null : t('comms.editor.saveBlocked')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>{t('comms.template.version', { version: template.version })}</span>
        <span>{t('comms.template.sends', { count: template.sendCount })}</span>
        <StatusBadge tone={template.inUse ? 'info' : 'neutral'}>
          {t(template.inUse ? 'comms.template.inUse' : 'comms.template.draft')}
        </StatusBadge>
      </div>

      <div className="grid grid-cols-2 gap-4 compact:grid-cols-1">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="template-subject" className="text-xs font-medium">
              {t('comms.editor.subject')}
            </Label>
            <Input
              id="template-subject"
              value={subject}
              disabled={!canWrite}
              onChange={(event) => setSubject(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="template-body" className="text-xs font-medium">
              {t('comms.editor.body')}
            </Label>
            <Textarea
              id="template-body"
              value={body}
              rows={10}
              disabled={!canWrite}
              onChange={(event) => setBody(event.target.value)}
              className="font-mono text-xs"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-foreground">{t('comms.editor.variables')}</span>
            <p className="text-xs text-muted-foreground">{t('comms.editor.variablesHelp')}</p>
            <ul className="flex flex-wrap gap-1.5">
              {variables.map((variable) => (
                <li key={variable.name}>
                  <StatusBadge tone="neutral">{variable.name}</StatusBadge>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* `dir` follows the template's locale: an Arabic template previews RTL (§9.1). */}
        <section
          aria-label={t('comms.editor.preview')}
          className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-3"
        >
          <span className="text-xs font-semibold text-foreground">{t('comms.editor.preview')}</span>
          <p className="text-xs text-muted-foreground">{t('comms.editor.previewHelp')}</p>
          <div dir={preview.dir} className="flex flex-col gap-2 text-start">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">{t('comms.editor.previewSubject')}</span>
              <p data-testid="preview-subject" className="text-xs font-semibold text-foreground">
                {preview.subject}
              </p>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">{t('comms.editor.previewBody')}</span>
              <p data-testid="preview-body" className="whitespace-pre-wrap text-xs text-foreground">
                {preview.body}
              </p>
            </div>
          </div>
        </section>
      </div>

      {validation.issues.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {[...validation.issues]
            .sort((a, b) => Number(b.severity === 'error') - Number(a.severity === 'error'))
            .map((issue) => (
              <li key={`${issue.code}-${issue.variable ?? issue.field ?? 'all'}`} className="flex items-center gap-2 text-xs">
                <StatusBadge tone={issue.severity === 'error' ? 'warning' : 'neutral'}>
                  {t(issue.severity === 'error' ? 'comms.editor.issueError' : 'comms.editor.issueWarning')}
                </StatusBadge>
                <span className="text-muted-foreground">{issueSentence(issue, t)}</span>
                {issue.code === 'undeclared-variable' && issue.variable !== null && canWrite && (
                  <Button size="xs" variant="secondary" onClick={() => declare(issue.variable ?? '')}>
                    {t('comms.editor.declare', { variable: issue.variable })}
                  </Button>
                )}
              </li>
            ))}
        </ul>
      )}

      {failed && (
        <Banner
          variant="card"
          banner={{ id: 'template-save-failed', tone: 'warning', title: t('comms.editor.error') }}
        />
      )}

      {confirming && (
        <Banner
          variant="card"
          role="status"
          banner={{
            id: 'template-in-use',
            tone: 'warning',
            title: t('comms.editor.confirm.title'),
            body: t('comms.editor.confirm.body', { name: template.name, count: template.sendCount }),
          }}
        />
      )}

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
        {/* §11.2: the refusal is text beside the control, never a tooltip. */}
        {blockedReason !== null && <span className="me-auto text-xs text-muted-foreground">{blockedReason}</span>}
        <Button
          size="xs"
          variant="ghost"
          disabled={saving || (!confirming && !dirty)}
          onClick={() => {
            if (confirming) {
              setConfirming(false)
              return
            }
            setSubject(template.subject)
            setBody(template.body)
            setVariables(template.variables.map((v) => ({ ...v })))
          }}
        >
          {confirming ? t('comms.editor.confirm.cancel') : t('comms.editor.discard')}
        </Button>
        <Button size="xs" variant="secondary" onClick={onSave} disabled={blockedReason !== null || saving || (!dirty && !confirming)}>
          {saving ? t('comms.editor.saving') : confirming ? t('comms.editor.confirm.save') : t('comms.editor.save')}
        </Button>
      </div>
    </div>
  )
}

/** One key per issue code. Never a prefix concatenated to a reason (AC-75). */
function issueSentence(issue: EmailTemplateIssue, t: Translate): string {
  switch (issue.code) {
    case 'undeclared-variable':
      return t(issue.field === 'subject' ? 'comms.issue.undeclared.subject' : 'comms.issue.undeclared.body', {
        variable: issue.variable ?? '',
      })
    case 'unused-variable':
      return t('comms.issue.unused', { variable: issue.variable ?? '' })
    case 'empty-subject':
      return t('comms.issue.emptySubject')
    case 'empty-body':
      return t('comms.issue.emptyBody')
    case 'template-in-use':
      return t('comms.issue.inUse')
  }
}
