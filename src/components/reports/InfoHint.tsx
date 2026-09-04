/**
 * **`InfoHint` — one sentence, asked for rather than issued.**
 *
 * ## What it replaced
 *
 * The report builder's two rails carried a standing
 * `<p className="text-xs text-muted-foreground">` under almost every control:
 * the cohort anchor, the horizon, the journey root, the depth, the funnel
 * window, both population predicates, every *why this control is off* sentence,
 * and both `Reasons` lists. Fourteen paragraphs in a 288px column. The owner's
 * words: *"remove all those dumb overwhelming descriptions you are adding
 * everywhere and add i icon when hovered it just show me those details."*
 *
 * The sentences were not wrong and they are not deleted. **Every one keeps its
 * key and its words and changes carrier only** — the row keeps its height, the
 * paragraph goes behind this button, and an operator who wants the reason gets
 * it in one hover or one Tab.
 *
 * ## Why hover-only was rejected
 *
 * A `title` attribute, a `<span>` with an `onMouseEnter`, or anything else that
 * opens on the pointer and nothing else, hides the sentence from **every**
 * keyboard operator and fails SC 1.4.13 outright — content that appears on
 * hover must also be dismissible, hoverable and persistent, and content that
 * appears at all must be reachable without a pointing device (§7.2).
 *
 * So this is a real `<button type="button">` with `t('rb.hint.show')` as its
 * accessible name. It opens on **focus** exactly as it opens on hover, its
 * content is hoverable, `Escape` dismisses it, and the trigger is
 * `aria-describedby` the content while it is open — all four from the Radix
 * primitive, none of it hand-rolled.
 *
 * **It also opens on click**, which the primitive does not do by itself:
 * `TooltipTrigger` ignores `pointerType === 'touch'` (`react-tooltip`
 * `:190-191`), so on a tablet the icon would be a control that does nothing at
 * all. Controlling `open` and forcing it true on click costs three lines and
 * closes that hole. Click only ever *opens* — never toggles — so `Enter` on a
 * focused trigger cannot close the thing focus just opened.
 *
 * ## Why it carries its own `TooltipProvider`
 *
 * `useTooltipProviderContext` has **no default context**: a `Tooltip` outside a
 * provider throws, not degrades. `App.tsx` mounts one for the product, but a
 * rail rendered on its own — in a test, in a dialog tree, in a future surface —
 * would crash on an icon. The nested provider takes no props, so it inherits
 * the same zero delay `App.tsx`'s does; nesting changes the delay policy only
 * if the product's ever stops being the wrapper's default, and that is a
 * one-line follow-up rather than a crash.
 *
 * ## The §5.7 tension, stated rather than hidden
 *
 * §5.7 says *helper text under fields, not tooltips*, and `ui/tooltip.tsx`'s own
 * header says a tooltip names an icon-only control **and nothing else**. This
 * component is a deliberate, owner-directed exception for the report builder's
 * two rails, and it is raised in the handoff rather than settled here. Nothing
 * that is a **state** moved: `role="status"` announcements, `ErrorState`,
 * `LoadingSkeleton`, and a whole group's `disabledReason` all still render on
 * the page. See `LegalityOptions.tsx` and the two rails for the line.
 *
 * Rules applied
 *   §7.2       a real `<button>`, in the tab order, with the primitive's own
 *              `focus-visible` ring. Reachable and dismissible without a
 *              pointer; SC 1.4.13 satisfied by the primitive, and touch closed
 *              by the click handler above.
 *   §5.7       the accessible name is a fixed key (`rb.hint.show`), never
 *              assembled and never the sentence itself.
 *   R15        the trigger keeps `Button`'s 8px geometry. The circle an
 *              operator sees is lucide's glyph, not an overridden radius.
 *   §9.1       the icon sits after the label by flex order, which follows
 *              `dir`. No physical utility anywhere in this file.
 *   §9.4/§14   the content is `<bdi>`-isolated so an interpolated measure name
 *              or date cannot drag the sentence's punctuation across the line
 *              in Arabic (`i18n.md`, *Bidi isolation*).
 */

import { useState, type ReactNode } from 'react'
import { InfoIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { Translate } from '@/lib'

export interface InfoHintProps {
  /**
   * **Already translated.** The caller owns the key and the params; this
   * component never calls `t` on anything but its own accessible name, so it
   * cannot assemble a sentence out of fragments (`i18n.md`).
   *
   * Nullish, `false` and `[]` render nothing at all — a control with nothing to
   * explain shows no icon rather than an icon that opens an empty box.
   */
  children: ReactNode
  t: Translate
}

export function InfoHint({ children, t }: InfoHintProps) {
  /* Controlled only so that a tap can open it — see the header. Radix still
     drives every other transition through `onOpenChange`: pointer enter and
     leave, focus and blur, `Escape`, and a pointer-down outside. */
  const [open, setOpen] = useState(false)

  if (children === null || children === undefined || children === false) return null
  if (Array.isArray(children) && children.length === 0) return null

  return (
    <TooltipProvider>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            /* The name is the fixed key, not the sentence: a screen reader
               reads the sentence from the tooltip Radix wires up as the
               trigger's description while it is open. Naming the button with
               the sentence would say it twice and make the control's name
               change under the operator. */
            aria-label={t('rb.hint.show')}
            className="text-muted-foreground"
            onClick={() => setOpen(true)}
          >
            <InfoIcon aria-hidden="true" className="size-3.5" />
          </Button>
        </TooltipTrigger>
        {/* `max-w-3xs` is 16rem — about 40 characters at the content's own
            `text-xs`. Wider and the "one short sentence" contract stops being
            true; `TooltipContent`'s stock `max-w-xs` measured ~53. */}
        <TooltipContent className="max-w-3xs">
          <bdi className="block">{children}</bdi>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * **Several sentences in one hint, without a list inside a `<bdi>`.**
 *
 * A control can owe an operator more than one sentence — the cohort anchor owes
 * its explanation *and* whatever violation the planner raised against it — and
 * `<ul>` is not phrasing content, so it cannot live inside the isolation
 * element. Block `<span>`s can, and they stack the same way.
 *
 * Falsy entries are dropped so a call site can read as the condition it is:
 * `hintLines([unstarted && t('…'), first && t(first.population.predicateKey)])`.
 * An empty result is `null`, which `InfoHint` renders as no icon at all.
 */
export function hintLines(
  sentences: ReadonlyArray<string | false | null | undefined>,
): ReactNode {
  const kept = sentences.filter((line): line is string => typeof line === 'string' && line !== '')
  if (kept.length === 0) return null
  return kept.map((line, index) => (
    <span key={`${index}-${line}`} className="block">
      {line}
    </span>
  ))
}
