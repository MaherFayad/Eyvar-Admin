/**
 * Naming and saving a report — §9.3, AC-856 … AC-859.
 *
 * ## A failed save never closes the dialog it came from
 *
 * `saveReport` returns `{ status: 'invalid', reasons }` for validation and
 * **throws** only for transport, and the difference is load-bearing: an invalid
 * name is a domain answer the dialog renders in place with the operator's input
 * intact, while `?mockFail=reports.save` is a transport failure that also
 * leaves the dialog open with the name and description preserved (**AC-859**).
 * Neither closes anything, and neither discards what was typed.
 *
 * ## Disabled, not errored
 *
 * `Save` is off until a name exists, and **the disabled state carries no error
 * text** (**AC-856**). DESIGN.md §3.2: *"validate by disabling the primary
 * button, not by showing an error after submit."* An operator who has typed
 * nothing yet has not made a mistake.
 *
 * ## `Save` and `Save as` are distinguishable before the click
 *
 * **AC-858.** The dialog's own title says which one this is, and the button
 * repeats it. The distinction is `id: null` versus `id: report.id` in the input
 * — two calls, not a mode — so nothing here has to remember which branch it is
 * in after the fact.
 *
 * Rules applied
 *   §11.6/R10   a modal for a decision that blocks; no toast underneath it, so
 *               one event has one surface.
 *   §3.2        the primary is disabled while the form cannot be submitted.
 *   §7.2        the name field takes focus on open and every control has a
 *               visible ring.
 *   R3          one primary in the dialog.
 */

import { useEffect, useState } from 'react'
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
import {
  Field,
  FieldContent,
  FieldControl,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { saveReport } from '@/data/clients'
import { REPORT_NAME_MAX } from '@/data/types'
import type { ReportQuery, SaveInvalidReason, SavedReport } from '@/data/types'
import type { Translator } from '@/lib'

export interface SaveReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `null` creates. A value updates in place. */
  report: SavedReport | null
  query: ReportQuery
  onSaved: (report: SavedReport) => void
  t: Translator
}

export function SaveReportDialog({
  open,
  onOpenChange,
  report,
  query,
  onSaved,
  t,
}: SaveReportDialogProps) {
  const [name, setName] = useState(report?.name ?? '')
  const [description, setDescription] = useState(report?.description ?? '')
  const [visibility, setVisibility] = useState<SavedReport['visibility']>(
    report?.visibility ?? 'private',
  )
  const [reasons, setReasons] = useState<readonly SaveInvalidReason[]>([])
  const [failed, setFailed] = useState(false)
  const [saving, setSaving] = useState(false)

  /* Re-seed when the dialog opens against a different record. Not on every
     render: that would overwrite what the operator is typing. */
  useEffect(() => {
    if (!open) return
    setName(report?.name ?? '')
    setDescription(report?.description ?? '')
    setVisibility(report?.visibility ?? 'private')
    setReasons([])
    setFailed(false)
  }, [open, report])

  const submit = async () => {
    setSaving(true)
    setFailed(false)
    try {
      const outcome = await saveReport({
        id: report?.id ?? null,
        name,
        description: description.trim() === '' ? null : description,
        query,
        visibility,
      })
      if (outcome.status === 'invalid') {
        setReasons(outcome.reasons)
        return
      }
      onSaved(outcome.report)
    } catch {
      /* Transport. The dialog stays open and the input is preserved (AC-859). */
      setFailed(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="default">
        <DialogHeader>
          <DialogTitle>{report ? t('rb.save.title') : t('rb.saveAs.title')}</DialogTitle>
          <DialogDescription>{t('rb.save.visibility')}</DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field id="rb-save-name">
            <FieldLabel>{t('rb.save.name')}</FieldLabel>
            <FieldControl>
              <Input
                autoFocus
                maxLength={REPORT_NAME_MAX}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </FieldControl>
          </Field>

          <Field id="rb-save-description">
            <FieldLabel optional={t('field.optional')}>{t('rb.save.description')}</FieldLabel>
            <FieldControl>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </FieldControl>
          </Field>

          <FieldSet>
            <FieldLegend>{t('rb.save.visibility')}</FieldLegend>
            <RadioGroup
              value={visibility}
              onValueChange={(value) => setVisibility(value as SavedReport['visibility'])}
            >
              <Field id="rb-vis-private" orientation="horizontal">
                <FieldControl>
                  <RadioGroupItem value="private" />
                </FieldControl>
                <FieldContent>
                  <FieldLabel>{t('rb.save.visibility.private')}</FieldLabel>
                </FieldContent>
              </Field>
              <Field id="rb-vis-team" orientation="horizontal">
                <FieldControl>
                  <RadioGroupItem value="team" />
                </FieldControl>
                <FieldContent>
                  <FieldLabel>{t('rb.save.visibility.team')}</FieldLabel>
                </FieldContent>
              </Field>
            </RadioGroup>
          </FieldSet>

          {/* Domain validation, in place, with the input intact.

              §10.4 — these used to render at `--ev-text-2`, which is the HELPER
              tone. A blocking reason drawn in the same ink as a hint is colour
              carrying no meaning at all; `FieldError` gives it the red and the
              glyph, and the glyph is the carrier that survives a monochrome
              screen. */}
          <FieldError errors={reasons.map((reason) => ({
            message: t(`rb.save.invalid.${reason}`, { max: REPORT_NAME_MAX }),
          }))} />
          {failed ? <FieldError>{t('rb.save.failed')}</FieldError> : null}
        </FieldGroup>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            {t('rb.save.cancel')}
          </Button>
          {/* §3.2 — disabled while the form cannot be submitted, and carrying no
              error text while it is (AC-856). */}
          <Button
            type="button"
            variant="default"
            disabled={saving || name.trim() === ''}
            onClick={() => void submit()}
          >
            {t('rb.save.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
