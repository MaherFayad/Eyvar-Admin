/**
 * **One control shape for every "you cannot, and here is why"** — D9 CQ-3:
 * *destinations and records are absent; actions are disabled in place with a
 * reason.* AC-816, AC-836, AC-840 and AC-899 are all this component.
 *
 * ## It computes nothing
 *
 * `planReportQuery` is synchronous and pure and already returns
 * `OptionLegality<T> = { value, legal, reasonKey, reasonParams }` for every
 * grain and every chart type. `reports.run` calls the **same** function before
 * it resolves anything, so a greyed option and a refused query give the
 * identical sentence. If this component decided legality itself there would be
 * two implementations of one rule and they would drift — which is the whole
 * reason the rule was moved into a pure function in the first place.
 *
 * So the contract here is narrow on purpose: it takes options, it renders them,
 * and it never inspects a query. There is no `query` prop and there is not
 * meant to be one.
 *
 * ## Why a reason list and not a tooltip
 *
 * A tooltip does not open on a disabled control — pointer events are off and
 * `Escape` is the only key that reaches it — so a tooltip'd reason is a reason
 * nobody can read, which is worse than no reason because it looks answered.
 * The reasons render as a list **beneath the group**, each `<li>` carrying the
 * `id` its own disabled button points at with `aria-describedby`. Sighted and
 * screen-reader operators get the same sentence from the same node (AC-899).
 *
 * Rules applied
 *   D9 CQ-3    disabled in place with a reason. Never hidden, never removed,
 *              never silently corrected after the fact.
 *   §7.2       every option is a real `<button>` with the primitive's own
 *              focus ring. A disabled one stays in the DOM and out of the tab
 *              order, and its reason is reachable from the selected sibling.
 *   §9.1       the row wraps and orders by direction; nothing is placed by a
 *              physical side.
 *   R3         no option is the page's primary. The selected one is the
 *              everyday secondary with `aria-pressed`, which is what makes the
 *              selection announced rather than merely coloured (§7.5).
 */

import { useId } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { OptionLegality } from '@/data/types'
import type { Translate } from '@/lib'

export interface LegalityOptionsProps<T extends string> {
  /** Already translated. Labels the group for a screen reader and on screen. */
  label: string
  options: ReadonlyArray<OptionLegality<T>>
  value: T
  onChange: (value: T) => void
  /** Already translated. One label per option value; never assembled. */
  labelFor: (value: T) => string
  /** The whole group is inert — the report is unstarted (AC-807). */
  disabled?: boolean
  /** Stated when `disabled` is true, so the group says why it is off. */
  disabledReason?: string
  /**
   * **A reason may not render a raw enum value at an operator.**
   *
   * The planner's `reasonParams` carry the machine's vocabulary — `hour`,
   * `pie`, `week` — because the data layer holds no display string and must
   * not. Interpolating them straight into a sentence produces *"hour is finer
   * than this data goes"*, which is a lowercase identifier wearing a sentence,
   * and it is untranslatable besides.
   *
   * So the caller — which owns the labels — maps them. It is a hook rather than
   * a lookup here because only the caller knows which params of which control
   * are option values and which are plain numbers.
   */
  resolveParams?: (params: Record<string, string | number>) => Record<string, string | number>
  t: Translate
}

export function LegalityOptions<T extends string>({
  label,
  options,
  value,
  onChange,
  labelFor,
  disabled = false,
  disabledReason,
  resolveParams = (params) => params,
  t,
}: LegalityOptionsProps<T>) {
  const groupId = useId()
  const reasonId = (option: OptionLegality<T>) => `${groupId}-${option.value}`

  const illegal = options.filter((option) => !option.legal)

  return (
    <div className="flex flex-col gap-1.5">
      <Label id={`${groupId}-label`}>{label}</Label>
      {/* `group`, not `radiogroup`: a radio group owns arrow-key navigation and
          takes one tab stop, and an option here can be disabled — which a
          roving-focus group has to skip, silently, exactly where the reason
          lives. Individually focusable buttons keep every legal option one Tab
          away and keep the reason attached to the thing it describes. */}
      <div role="group" aria-labelledby={`${groupId}-label`} className="flex flex-wrap gap-1">
        {options.map((option) => {
          const selected = option.value === value
          const off = disabled || !option.legal
          return (
            <Button
              key={option.value}
              type="button"
              size="xs"
              variant={selected ? 'secondary' : 'ghost'}
              aria-pressed={selected}
              disabled={off}
              aria-describedby={option.legal ? undefined : reasonId(option)}
              onClick={() => onChange(option.value)}
            >
              {labelFor(option.value)}
            </Button>
          )
        })}
      </div>

      {disabled && disabledReason ? (
        <p className="text-xs text-muted-foreground">{disabledReason}</p>
      ) : null}

      {!disabled && illegal.length > 0 && (
        <ul className="flex list-none flex-col gap-0.5">
          {illegal.map((option) => (
            <li key={option.value} id={reasonId(option)} className="text-xs text-muted-foreground">
              {option.reasonKey
                ? t(option.reasonKey, resolveParams(option.reasonParams))
                : labelFor(option.value)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
