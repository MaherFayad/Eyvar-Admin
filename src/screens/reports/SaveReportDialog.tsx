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
import { Label } from '@/components/ui/label'
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{report ? t('rb.save.title') : t('rb.saveAs.title')}</DialogTitle>
          <DialogDescription>{t('rb.save.visibility')}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rb-save-name">{t('rb.save.name')}</Label>
            <Input
              id="rb-save-name"
              autoFocus
              maxLength={REPORT_NAME_MAX}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rb-save-description">{t('rb.save.description')}</Label>
            <Textarea
              id="rb-save-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="pb-1.5 text-sm font-medium text-foreground">
              {t('rb.save.visibility')}
            </legend>
            <RadioGroup
              value={visibility}
              onValueChange={(value) => setVisibility(value as SavedReport['visibility'])}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem id="rb-vis-private" value="private" />
                <Label htmlFor="rb-vis-private">{t('rb.save.visibility.private')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem id="rb-vis-team" value="team" />
                <Label htmlFor="rb-vis-team">{t('rb.save.visibility.team')}</Label>
              </div>
            </RadioGroup>
          </fieldset>

          {/* Domain validation, in place, with the input intact. */}
          {reasons.length > 0 && (
            <ul role="alert" className="flex list-none flex-col gap-0.5">
              {reasons.map((reason) => (
                <li key={reason} className="text-xs text-muted-foreground">
                  {t(`rb.save.invalid.${reason}`, { max: REPORT_NAME_MAX })}
                </li>
              ))}
            </ul>
          )}
          {failed && (
            <p role="alert" className="text-xs text-muted-foreground">
              {t('rb.save.failed')}
            </p>
          )}
        </div>

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
