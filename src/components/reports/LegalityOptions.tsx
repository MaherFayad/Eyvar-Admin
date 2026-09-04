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
 * ## Two options, one reason, and it printed twice
 *
 * `planCohortGrains` (`plan.ts:679`) marks **both** `day` and `week` illegal
 * with `rb.cohort.grainUnavailable`, and that sentence interpolates nothing —
 * so the two options resolved to the identical 33-word string and the rail
 * printed it once under the other. The owner sent the screenshot.
 *
 * The fix is a dedupe **on the resolved string, not on the reason key and not
 * on the option value.** A key is not the unit: `{grain: 'day'}` and
 * `{grain: 'week'}` are different params that *could* produce two different
 * sentences, and where they do, both must still show. What an operator reads is
 * the sentence, so the sentence is the identity.
 *
 * When two options collapse to one sentence, **both keep an `aria-describedby`
 * that resolves** — they point at the one surviving node. A disabled control
 * whose reason has no target is worse than a duplicate: it looks answered and
 * is not.
 *
 * ## Where the reasons render now
 *
 * Beside the group's label, in an `InfoHint`, with the surviving sentences
 * **also** in an `sr-only` list that carries the `id`s. That split is
 * deliberate and it is the one part of AC-899 that moved:
 *
 * - a tooltip's content is **only in the DOM while it is open**, so it can
 *   never be the target of an `aria-describedby` on a control that is not
 *   focused. The `sr-only` list is always mounted, so the association a
 *   disabled option carries is always live.
 * - a tooltip does not open on a **disabled** control either — pointer events
 *   are off — which is why the hint hangs off the *group's label*, one Tab
 *   away and reachable, rather than off the option that cannot be reached.
 *
 * So the sentence is one sentence in two carriers rather than in two nodes an
 * operator can both see. It is not the "same node" the old comment promised;
 * it is the same string, always present for assistive tech and one hover or
 * Tab away for everyone else.
 *
 * **The one thing that did not move**: `disabledReason`. When the whole group
 * is off, the reason stays on the page. An operator who cannot use any option
 * needs to know why without hunting for an icon.
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

import { useId, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { OptionLegality } from '@/data/types'
import type { Translate } from '@/lib'
import { InfoHint, hintLines } from './InfoHint'

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
  /**
   * **§1.5 / §A7 — a leading 16px glyph per option, `currentColor`, decorative.**
   *
   * The chart-type group is the one control an operator finds by shape rather
   * than by reading, and Amplitude's toolbar puts an icon on every entry of it.
   * The glyph is `aria-hidden` at the call site: the label carries the name, so
   * the accessible name of a `Pie` button is still `Pie` and the reason a
   * disabled one points at is unchanged.
   *
   * Optional, and absent by default — the grain and cohort-grain groups have no
   * honest glyph and inventing five would be five design decisions taken in a
   * component.
   */
  iconFor?: (value: T) => ReactNode
  /**
   * **The label still exists; it is only unseen.**
   *
   * A toolbar sets its controls side by side and names them by shape and by
   * position (§A7). A stacked `Label` over each would be four words of chrome
   * per control on one row. The `<Label>` element stays — it is what
   * `aria-labelledby` points at, so the group keeps its accessible name and a
   * `getByLabelText` still finds it — and only its box is visually hidden.
   * **Never use this where a control is alone on its own row.**
   */
  hideLabel?: boolean
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
  iconFor,
  hideLabel = false,
  t,
}: LegalityOptionsProps<T>) {
  const groupId = useId()

  /**
   * The resolved sentence, once per illegal option. **This is the dedupe key**
   * — see the header. `t` and `resolveParams` run here and nowhere else in this
   * component, so what is compared is exactly what is read.
   */
  const sentenceOf = (option: OptionLegality<T>) =>
    option.reasonKey
      ? t(option.reasonKey, resolveParams(option.reasonParams))
      : labelFor(option.value)

  /* Insertion order is the option order, so `day`'s node survives and `week`
     points at it — the first option to state a reason owns it. */
  const bySentence = new Map<string, { id: string; text: string }>()
  /* Every illegal option -> the id of the node that carries its sentence. Two
     options that collapse to one `<li>` share one id, which is legal:
     `aria-describedby` is an IDREF list and nothing forbids two controls
     naming the same target. */
  const describedBy = new Map<T, string>()

  for (const option of options) {
    if (option.legal) continue
    const text = sentenceOf(option)
    const held = bySentence.get(text)
    if (held) {
      describedBy.set(option.value, held.id)
      continue
    }
    const id = `${groupId}-${option.value}`
    bySentence.set(text, { id, text })
    describedBy.set(option.value, id)
  }

  const reasons = [...bySentence.values()]

  /**
   * **A description must always have a target.**
   *
   * The per-option list is not rendered when the whole group is off, so an
   * `aria-describedby` pointing into it would dangle in exactly the state where
   * the operator most needs an answer. When the group is off the honest
   * description is the group's own sentence, so every option points at that
   * one; with no `disabledReason` there is nothing to point at and the
   * attribute is dropped rather than left hanging.
   */
  const disabledReasonId = `${groupId}-off`
  const describedByFor = (option: OptionLegality<T>) => {
    if (option.legal) return undefined
    if (disabled) return disabledReason ? disabledReasonId : undefined
    return describedBy.get(option.value)
  }

  return (
    <div className={cn('flex flex-col', hideLabel ? 'gap-0.5' : 'gap-1.5')}>
      {/* The label and its hint share one row — that is the whole point of the
          change: the row keeps its height and the paragraph disappears. The
          `InfoHint` is a SIBLING of the `<Label>`, never a child: a `<button>`
          inside a `<label>` joins the field's accessible name, so the group
          would be called "Cohort grain What this means". */}
      <div className="flex items-center gap-1.5">
        <Label id={`${groupId}-label`} className={hideLabel ? 'sr-only' : undefined}>
          {label}
        </Label>
        {/* Nothing to explain when the whole group is off — `disabledReason`
            below is on the page instead, and repeating it in a hint would be
            the same sentence twice, which is the bug this change removes. */}
        {!disabled && <InfoHint t={t}>{hintLines(reasons.map((reason) => reason.text))}</InfoHint>}
      </div>
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
              aria-describedby={describedByFor(option)}
              onClick={() => onChange(option.value)}
            >
              {iconFor?.(option.value)}
              {labelFor(option.value)}
            </Button>
          )
        })}
      </div>

      {/* **Stays on the page.** The group is off entirely; there is no option
          to reach and no reason to make the operator find an icon first. */}
      {disabled && disabledReason ? (
        <p id={disabledReasonId} className="text-xs text-muted-foreground">
          {disabledReason}
        </p>
      ) : null}

      {/* The `aria-describedby` targets, always mounted. A tooltip's content is
          not in the DOM while it is closed, so it cannot be the target of a
          description on a disabled control — this list is what keeps the
          association live. `sr-only`, because the visible copy is the hint. */}
      {!disabled && reasons.length > 0 && (
        <ul className="sr-only">
          {reasons.map((reason) => (
            <li key={reason.id} id={reason.id}>
              {reason.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
