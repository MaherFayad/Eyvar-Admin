/**
 * The template editor, with the preview that made this task worth doing.
 *
 * **The preview renders the template, not the source.** `renderEmailPreview`
 * substitutes each variable's declared sample, so the operator reads the mail
 * the customer will read. A panel showing `{{riderName}}` beside a field
 * showing `{{riderName}}` is not a preview; it is the same textarea with a
 * different border.
 *
 * **Validation is the same function the save runs.** `emailTemplateIssues` is
 * exported by the client and used here on every keystroke and there on every
 * save. A body that references a variable the template does not declare is a
 * **save-blocking error naming the variable**, the button is disabled in place
 * with that sentence beside it (§11.2), and the offer to fix it — `Declare` —
 * sits next to the message.
 *
 * **A template in use warns before it saves.** The footer becomes a two-step
 * confirmation naming the template and how many times it has been sent, because
 * "this may be in use" is not information anyone can weigh. The client refuses
 * an unconfirmed save with a 409 regardless, so the gate is a contract and not
 * a courtesy.
 *
 * Arabic is a first-class case, not an afterthought: the preview panel carries
 * `dir` from the template's own locale, so an Arabic template previews RTL
 * inside an LTR console (§9.1).
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { emailTemplateIssues, renderEmailPreview, saveEmailTemplate } from '@/data/clients'
import type {
  EmailTemplate,
  EmailTemplateDraft,
  EmailTemplateIssue,
  EmailTemplateVariable,
} from '@/data/types/email'
import type { Translate } from '@/lib'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Banner } from '@/components/Banner'
import { StatusBadge } from '@/components/StatusBadge'

export interface TemplateEditorDialogProps {
  /** `null` closes the dialog. The editor holds no draft between openings. */
  template: EmailTemplate | null
  canWrite: boolean
  actorId: string
  t: Translate
  onClose: () => void
  onSaved: (saved: EmailTemplate) => void
}

export function TemplateEditorDialog({
  template,
  canWrite,
  actorId,
  t,
  onClose,
  onSaved,
}: TemplateEditorDialogProps) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [variables, setVariables] = useState<EmailTemplateVariable[]>([])
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)

  /* The draft is seeded from the template each time one is opened, and never
     carried across openings: an editor that remembers the last template's body
     is one mis-click away from overwriting a live template with another's. */
  useEffect(() => {
    if (!template) return
    setSubject(template.subject)
    setBody(template.body)
    setVariables(template.variables.map((variable) => ({ ...variable })))
    setConfirming(false)
    setSaving(false)
    setFailed(false)
  }, [template])

  const draft: EmailTemplateDraft = useMemo(
    () => ({ subject, body, variables }),
    [subject, body, variables],
  )

  const validation = useMemo(
    () => emailTemplateIssues(draft, { inUse: template?.inUse ?? false }),
    [draft, template],
  )

  /* Rendered locally rather than fetched: the client's `previewEmailTemplate`
     runs this same pure function, and a network round trip per keystroke would
     buy nothing but latency. The async operation stays the contract for a
     server that renders previews itself. */
  const preview = useMemo(
    () => (template ? renderEmailPreview(template, draft) : null),
    [template, draft],
  )

  const declare = useCallback((name: string) => {
    setVariables((current) =>
      current.some((variable) => variable.name === name)
        ? current
        : [...current, { name, required: true, sample: name }],
    )
  }, [])

  const commit = useCallback(async () => {
    if (!template) return
    setSaving(true)
    setFailed(false)
    try {
      const saved = await saveEmailTemplate(template.id, draft, { confirmInUse: true, actorId })
      toast.success(t('comms.toast.templateSaved', { name: saved.name, version: saved.version }))
      onSaved(saved)
      onClose()
    } catch {
      setFailed(true)
    } finally {
      setSaving(false)
      setConfirming(false)
    }
  }, [actorId, draft, onClose, onSaved, t, template])

  const onSave = useCallback(() => {
    if (!template) return
    if (template.inUse && !confirming) {
      setConfirming(true)
      return
    }
    void commit()
  }, [commit, confirming, template])

  if (!template) return null

  const blockedReason = !canWrite
    ? t('comms.editor.readOnly')
    : validation.valid
      ? null
      : t('comms.editor.saveBlocked')

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      {/* The scale, not an arbitrary value: the editor is two columns and
          needs the room the default dialog does not give it. */}
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {t('comms.editor.title')}
            <span className="font-mono text-xs text-muted-foreground">{template.key}</span>
            <StatusBadge tone="neutral">
              {t(template.locale === 'ar' ? 'comms.template.locale.ar' : 'comms.template.locale.en')}
            </StatusBadge>
            {template.inUse && <StatusBadge tone="info">{t('comms.template.inUse')}</StatusBadge>}
          </DialogTitle>
          <DialogDescription>
            {t('comms.template.version', { version: template.version })}
          </DialogDescription>
        </DialogHeader>

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

          {/* The preview. `dir` follows the template's locale, so an Arabic
              template reads RTL here inside an LTR console (§9.1). */}
          <section
            aria-label={t('comms.editor.preview')}
            className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">{t('comms.editor.preview')}</span>
            </div>
            <p className="text-xs text-muted-foreground">{t('comms.editor.previewHelp')}</p>
            <div dir={preview?.dir ?? 'ltr'} className="flex flex-col gap-2 text-start">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">{t('comms.editor.previewSubject')}</span>
                <p data-testid="preview-subject" className="text-xs font-semibold text-foreground">
                  {preview?.subject}
                </p>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">{t('comms.editor.previewBody')}</span>
                <p
                  data-testid="preview-body"
                  className="whitespace-pre-wrap text-xs text-foreground"
                >
                  {preview?.body}
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Every issue, error first. Each error names the variable and offers
            the fix beside it; a warning states the fact and asks for nothing. */}
        {validation.issues.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {[...validation.issues]
              .sort((a, b) => Number(b.severity === 'error') - Number(a.severity === 'error'))
              .map((issue) => (
                <li
                  key={`${issue.code}-${issue.variable ?? issue.field ?? 'all'}`}
                  className="flex items-center gap-2 text-xs"
                >
                  <StatusBadge tone={issue.severity === 'error' ? 'warning' : 'neutral'}>
                    {t(
                      issue.severity === 'error'
                        ? 'comms.editor.issueError'
                        : 'comms.editor.issueWarning',
                    )}
                  </StatusBadge>
                  <span className="text-muted-foreground">{issueSentence(issue, t)}</span>
                  {issue.code === 'undeclared-variable' && issue.variable !== null && canWrite && (
                    <DeclareButton name={issue.variable} onDeclare={declare} t={t} />
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
              body: t('comms.editor.confirm.body', {
                name: template.name,
                count: template.sendCount,
              }),
            }}
          />
        )}

        <DialogFooter>
          {/* §11.2 — the refusal is text beside the control, not a tooltip. */}
          {blockedReason !== null && (
            <span className="me-auto text-xs text-muted-foreground">{blockedReason}</span>
          )}
          <Button
            size="xs"
            variant="secondary"
            onClick={confirming ? () => setConfirming(false) : onClose}
            disabled={saving}
          >
            {confirming ? t('comms.editor.confirm.cancel') : t('comms.editor.cancel')}
          </Button>
          <Button size="xs" onClick={onSave} disabled={blockedReason !== null || saving}>
            {saving
              ? t('comms.editor.saving')
              : confirming
                ? t('comms.editor.confirm.save')
                : t('comms.editor.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Narrows `variable` to a string once, so no call site needs a `!`. */
function DeclareButton({
  name,
  onDeclare,
  t,
}: {
  name: string
  onDeclare: (name: string) => void
  t: Translate
}) {
  return (
    <Button size="xs" variant="secondary" onClick={() => onDeclare(name)}>
      {t('comms.editor.declare', { variable: name })}
    </Button>
  )
}

/** One key per issue code. Never a prefix concatenated to a reason (AC-75). */
function issueSentence(issue: EmailTemplateIssue, t: Translate): string {
  switch (issue.code) {
    case 'undeclared-variable':
      return t(
        issue.field === 'subject' ? 'comms.issue.undeclared.subject' : 'comms.issue.undeclared.body',
        { variable: issue.variable ?? '' },
      )
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
