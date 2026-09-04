/**
 * An explanatory sentence the operator asks for instead of reads (X15). A real
 * `<button>` named by `shell.hint.show`, reachable without a pointer (§7.2);
 * it also opens on click, because the trigger ignores touch. Content is `<bdi>`
 * isolated (§9.4). Sanctioned §5.7 exception, `docs/RULINGS.md:48`.
 */

import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { InfoIcon } from '@/components/icons'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { Translate } from '@/lib'

export interface InfoHintProps {
  /* Already translated: the caller owns the key and the params, so no sentence
     is assembled from fragments here (`i18n.md`). Nullish, `false` and `[]`
     render no icon at all rather than one that opens an empty box. */
  children: ReactNode
  t: Translate
}

export function InfoHint({ children, t }: InfoHintProps) {
  /* Controlled only so that a tap can open it. Radix still drives every other
     transition through `onOpenChange`: pointer, focus, `Escape`, outside press. */
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
            /* The name is the fixed key, not the sentence: Radix wires the
               sentence up as the trigger's description while it is open, so
               naming the button with it would say it twice. */
            aria-label={t('shell.hint.show')}
            className="text-muted-foreground"
            onClick={() => setOpen(true)}
          >
            <InfoIcon aria-hidden="true" className="size-3.5" />
          </Button>
        </TooltipTrigger>
        {/* `max-w-3xs` is 16rem — about 40 characters at the content's own
            `text-xs`, which keeps the "one short sentence" contract true. */}
        <TooltipContent className="max-w-3xs">
          <bdi className="block">{children}</bdi>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/* Several sentences in one hint. `<ul>` is not phrasing content and cannot sit
   inside `<bdi>`; block `<span>`s stack the same way. Falsy entries drop, so a
   call site reads as the condition it is; an empty result is `null`. */
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
