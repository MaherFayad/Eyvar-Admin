/**
 * The plan editor's numeric controls, shared by the Details and Calculations
 * views. `NumberField` binds a form field; `TrialField` binds a trial number
 * (§11.8), which is not form state and so keeps its own text.
 */

import { useState } from 'react'
import type { Field } from '@/hooks'
import { parseNumericInput } from '@/lib'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * The numeric field, and the **one** coercion (§8.2.5). A blank field is `null`,
 * which flows into the derived chain and renders an em dash. There is no second
 * function with a different blank-field answer.
 */
export function NumberField({
  field,
  label,
  onChange,
}: {
  field: Field<number | null>
  label: string
  onChange: (value: number | null) => void
}) {
  const id = field.controlProps.id
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        {...field.controlProps}
        inputMode="numeric"
        value={field.value === null ? '' : String(field.value)}
        /* **AC-396** — dependents update on the `input` event, with no flash,
           no colour transition and no count-up. A controlled value is what
           makes that true rather than a debounce nobody can see. */
        onChange={(event) => onChange(parseNumericInput(event.target.value))}
        onBlur={field.onBlur}
      />
      <p id={field.errorId} className="text-xs text-muted-foreground">
        {field.error ?? ''}
      </p>
    </div>
  )
}

export interface TrialRange {
  /** Inclusive bounds; `null` for no bound on that side. */
  min: number | null
  max: number | null
}

/**
 * One trial number (§11.8). It owns its text so `1.` survives a keystroke, and
 * reports a value only while the text is a number inside `range`; outside it
 * the chain gets `null` and the em dash follows (AC-393), with the message on
 * this input (AC-394). Remount it with a `key` to adopt a new initial value.
 */
export function TrialField({
  id,
  label,
  initial,
  parse,
  range,
  message,
  onChange,
}: {
  id: string
  label: string
  /** Already formatted for the operator: `0.95`, `20`. */
  initial: string
  parse: (raw: string) => number | null
  range: TrialRange
  /** The message shown when the text is not a number in `range`. */
  message: string
  onChange: (value: number | null) => void
}) {
  const [text, setText] = useState(initial)
  const invalid = text.trim() !== '' && !inRange(parse(text), range)
  const messageId = `${id}-message`

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        inputMode="decimal"
        value={text}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? messageId : undefined}
        onChange={(event) => {
          const raw = event.target.value
          setText(raw)
          const parsed = parse(raw)
          onChange(inRange(parsed, range) ? parsed : null)
        }}
      />
      <p id={messageId} className="text-xs text-muted-foreground">
        {invalid ? message : ''}
      </p>
    </div>
  )
}

function inRange(value: number | null, range: TrialRange): value is number {
  if (value === null) return false
  if (range.min !== null && value < range.min) return false
  if (range.max !== null && value > range.max) return false
  return true
}
