/**
 * §2.4 — the inline `Add annotation` form. No dialog (the owner's standing
 * no-dialog ruling): it opens under the chart, pushing it down. A failed save
 * keeps the draft and the surface open (§8.3's standing rule).
 */

import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AnnotationKind } from '@/data/types/annotation'
import type { Translator } from '@/lib'

const KINDS: readonly AnnotationKind[] = ['launch', 'price', 'incident', 'campaign', 'other']

export interface AnnotationFormProps {
  onCancel: () => void
  onSubmit: (input: { date: string; label: string; kind: AnnotationKind; note: string }) => Promise<void>
  t: Translator
}

export function AnnotationForm({ onCancel, onSubmit, t }: AnnotationFormProps) {
  const [date, setDate] = useState('')
  const [label, setLabel] = useState('')
  const [kind, setKind] = useState<AnnotationKind>('other')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)

  const dateId = useId()
  const labelId = useId()
  const kindId = useId()
  const noteId = useId()

  const valid = date.trim().length > 0 && label.trim().length > 0

  const handleSubmit = async () => {
    if (!valid || saving) return
    setSaving(true)
    setFailed(false)
    try {
      await onSubmit({ date, label, kind, note })
    } catch {
      setFailed(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      aria-label={t('rb.chart.addAnnotation')}
      className="flex flex-col gap-3 rounded-xl border border-card-border bg-card p-3"
      onSubmit={(event) => {
        event.preventDefault()
        void handleSubmit()
      }}
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor={dateId}>{t('rb.annotation.form.date')}</Label>
          <Input
            id={dateId}
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="w-40"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Label htmlFor={labelId}>{t('rb.annotation.form.label')}</Label>
          <Input id={labelId} value={label} onChange={(event) => setLabel(event.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={kindId}>{t('rb.annotation.form.kind')}</Label>
          <Select value={kind} onValueChange={(value) => setKind(value as AnnotationKind)}>
            <SelectTrigger id={kindId} size="sm" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KINDS.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`rb.annotation.kind.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={noteId}>{t('rb.annotation.form.note')}</Label>
        <Textarea id={noteId} value={note} onChange={(event) => setNote(event.target.value)} />
      </div>
      {failed && <p className="text-xs text-muted-foreground">{t('rb.annotation.form.failed')}</p>}
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="xs" onClick={onCancel}>
          {t('rb.annotation.form.cancel')}
        </Button>
        <Button type="submit" variant="default" size="xs" disabled={!valid || saving}>
          {t('rb.annotation.form.submit')}
        </Button>
      </div>
    </form>
  )
}
