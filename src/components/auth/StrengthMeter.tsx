/**
 * The password strength meter — design §7.3. **Three levels, two tones, no red
 * and no blue.**
 *
 * | Level | Bar | Caption | Caption colour |
 * |---|---|---|---|
 * | Under 12 characters | track only, no fill | `At least 12 characters` | `--ev-text-2` |
 * | 12+, weak | 50 %, `--ev-amber` | `Password strength: weak` | `--ev-amber-dk` |
 * | 12+, strong | 100 %, `--ev-green` | `Password strength: strong` | `--ev-green` |
 *
 * **No red at any level** — R5a enumerates red to four uses and a weak password
 * is not a blocked one. **`--ev-blue` is not used either**: its declared roles
 * are the focus ring, a chart series, selection, and a link on white
 * (`03-navattic-language.md` §1.3), and a strength bar is none of them.
 *
 * ## The meter never gates submission
 *
 * It is a courtesy (spec §11.2). Only the 12-character minimum, the match
 * check and the server's breach list gate the primary. **Stated because an
 * engineer will otherwise disable `Save` on `weak`** — and this component is
 * where they would reach for the flag, so it does not have one.
 *
 * ## Why this is not `ui/progress.tsx`
 *
 * `Progress` is a `<progress>` with two tones (`neutral`, `warning`) and an
 * indicator whose class it owns. This bar is **`aria-hidden`** by design — the
 * caption carries the meaning, colour never does alone — so the ARIA machinery
 * a `<progress>` brings is exactly the part not wanted, and the two extra tones
 * would be added to a shared primitive for one consumer. Two `<div>`s and a
 * width are the honest shape.
 *
 * The caption takes `role="status"` `aria-live="polite"` so the level is
 * announced as it changes, once per change, without the bar being announced at
 * all.
 */

import { cn } from '@/lib/utils'
import type { PasswordStrength } from './authContract'

export interface StrengthMeterProps {
  strength: PasswordStrength
  /** Already translated: `At least 12 characters` / `Password strength: weak` / `…strong`. */
  caption: string
}

export function StrengthMeter({ strength, caption }: StrengthMeterProps) {
  return (
    <div className="mt-2 flex flex-col gap-1">
      {/* Track `--ev-bg2`, 4 px, `--ev-radius-control`. `aria-hidden` because
          the caption below is the carrier and a duplicate announcement of a
          decorative bar is noise. */}
      <div className="h-1 w-full overflow-hidden rounded-lg bg-muted" aria-hidden="true">
        <div
          className={cn(
            'h-full transition-[width]',
            strength === 'short' && 'w-0',
            /* §9 — the fill direction **mirrors**: it fills from the
               inline-start. A progress bar is a reading-direction quantity,
               not a numeric run, so unlike the code field it does flip. */
            strength === 'weak' && 'w-1/2 bg-warning-graphic',
            strength === 'strong' && 'w-full bg-success-foreground',
          )}
        />
      </div>
      <p
        role="status"
        aria-live="polite"
        className={cn(
          'text-xs font-semibold',
          strength === 'short' && 'font-normal text-muted-foreground',
          strength === 'weak' && 'text-warning-foreground',
          strength === 'strong' && 'text-success-foreground',
        )}
      >
        {caption}
      </p>
    </div>
  )
}
