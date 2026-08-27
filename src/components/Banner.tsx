/**
 * `Banner` (B-01) — design spec §11.4, built on the restyled `alert`.
 *
 * A banner names a **standing condition**: something that is true until someone
 * changes it. A transient confirmation is a toast (R10). Never both, and never
 * two banners.
 *
 * Rules applied
 *   R1 / R16    a PALE TINTED CARD in one of four tones. Not the saturated red
 *               strip in `02-orders/draft-order-validation-error-banner.webp` —
 *               that is banner Family A and R1 kills it.
 *   R17         ONE warning tone. "Waiting on them" and "waiting on you" are
 *               separated by the LABEL, never by a second fill.
 *   R5a #2      `critical` is blocking, and there is at most ONE per page.
 *   R10/AC-40   **at most one page-level banner, ever.** Two or more true
 *               conditions MERGE into one carrying a COUNT. `mergeBanners`
 *               below is that rule as a function, so a screen cannot render
 *               two by writing two — it has nothing to render two *with*.
 *   §11.4       placement: the first element of the CONTENT BLOCK, spanning
 *               main + rail, below the page header and above every card.
 *               Scoped to a card when the condition belongs to that card only.
 *   §11.4       DISMISS is present when the banner announces a completed
 *               action and ABSENT when it names a standing condition. An
 *               operator must not be able to dismiss "You are offline."
 *   §11.4       `shell` variant: full-bleed above the top bar, 32px, no radius,
 *               bottom hairline, one line plus actions.
 *   R6          full sentences take a period; titles and button labels do not.
 *   §7.5        `role="alert"` comes from `alert.tsx`; the tone is never the
 *               only carrier — every banner's meaning is in its words.
 *   R-3 §1.3    NO elevation. A banner is a tinted block inside the content
 *               flow, not a floating surface; the shell strip is chrome.
 */

import type { ReactNode } from 'react'
import {
  Alert,
  AlertActions,
  AlertDescription,
  AlertDismiss,
  AlertTitle,
} from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { XIcon } from 'lucide-react'

export type BannerTone = 'info' | 'success' | 'warning' | 'critical'
export type BannerVariant = 'page' | 'card' | 'shell'

export interface BannerAction {
  label: string
  onClick: () => void
}

/**
 * One standing condition, ready to render. Held as a value rather than as JSX
 * so `mergeBanners` can reduce a list of them to one.
 */
export interface BannerModel {
  id: string
  tone: BannerTone
  /** A fragment or a full sentence. R6 decides the period; the copy carries it. */
  title: string
  body?: string
  /** ZERO TO TWO. §11.4 caps it, and the type does not — the cap is asserted below. */
  actions?: BannerAction[]
  /** §11.4 — only for a completed action, never for a standing condition. */
  onDismiss?: () => void
}

export interface BannerProps {
  banner: BannerModel
  variant?: BannerVariant
  /** Rendered under the body, above the actions. The merged banner's item list. */
  children?: ReactNode
  className?: string
  dismissLabel?: string
  /**
   * **AC-678** — `alert` when the banner announces a rejection or a failure,
   * `status` when it is informational.
   *
   * `alert.tsx` hard-codes `role="alert"`, which is right for a standing
   * condition that is *wrong* and wrong for one that is merely *true*: a screen
   * reader interrupts whatever the operator was reading for an `alert`, and
   * `Check your inbox` does not earn an interruption. Design/08 §2.3 asks for
   * both, so the choice is exposed here and defaults to the existing behaviour
   * — no existing call site moves.
   */
  role?: 'alert' | 'status'
}

export function Banner({
  banner,
  variant = 'page',
  children,
  className,
  dismissLabel = 'Dismiss',
  /* Defaulted HERE rather than left `undefined`: `Alert` sets `role="alert"`
     and then spreads its props, so an explicit `role: undefined` would delete
     the role entirely instead of falling through to the default. */
  role = 'alert',
}: BannerProps) {
  /* §11.4 — zero to TWO secondary buttons. Beyond two is a design question,
     not a runtime one, so the extra ones are dropped rather than wrapped. */
  const actions = (banner.actions ?? []).slice(0, 2)

  return (
    <Alert tone={banner.tone} variant={variant} className={className} role={role}>
      <BannerGlyph tone={banner.tone} />
      <AlertTitle>{banner.title}</AlertTitle>
      {banner.body && <AlertDescription>{banner.body}</AlertDescription>}
      {children && <AlertDescription>{children}</AlertDescription>}
      {actions.length > 0 && (
        <AlertActions>
          {actions.map((action) => (
            <Button key={action.label} variant="secondary" size="xs" onClick={action.onClick}>
              {action.label}
            </Button>
          ))}
        </AlertActions>
      )}
      {banner.onDismiss && (
        <AlertDismiss className={cn(variant === 'shell' && 'top-1')}>
          <Button variant="ghost" size="icon-xs" onClick={banner.onDismiss} aria-label={dismissLabel}>
            <XIcon />
          </Button>
        </AlertDismiss>
      )}
    </Alert>
  )
}

/**
 * **AC-40 as a function.** Zero conditions → nothing. One → itself. Two or
 * more → ONE banner carrying a count, at the highest tone present, with each
 * condition's own actions up to the two-action cap.
 *
 * `countTitle` is a translated string the caller has already resolved through
 * `state.merged.message` with its `{count}` filled — no concatenation happens
 * here (**AC-75**).
 */
export function mergeBanners(
  banners: readonly BannerModel[],
  countTitle: (count: number) => string,
): BannerModel | null {
  if (banners.length === 0) return null
  const [only] = banners
  if (banners.length === 1 && only) return only

  /* §5.2's merge clause: the merged banner takes the most severe tone present.
     `critical` outranks `warning` outranks `info` outranks `success`, because a
     merged banner must not under-report. */
  const order: BannerTone[] = ['critical', 'warning', 'info', 'success']
  const tone = order.find((candidate) => banners.some((b) => b.tone === candidate)) ?? 'info'

  return {
    id: banners.map((b) => b.id).join('+'),
    tone,
    title: countTitle(banners.length),
    /* Each condition on its own line, per §4.2's four-row table. The lines are
       already-translated strings; the list is rendered, not concatenated. */
    actions: banners.flatMap((b) => b.actions ?? []).slice(0, 2),
  }
}

/** The lines of a merged banner — one condition per line (§4.2). */
export function BannerConditionList({ lines }: { lines: readonly string[] }) {
  return (
    <ul className="flex list-none flex-col gap-0.5">
      {lines.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  )
}

/**
 * §11.4's glyph column. 16px, inline-start, `currentColor` — so it takes the
 * tone's LABEL colour and needs no per-tone fill. None of the four mirrors
 * (§9.5): they are marks.
 */
function BannerGlyph({ tone }: { tone: BannerTone }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {tone === 'success' ? (
        <path d="M4 12.5l5 5L20 6.5" />
      ) : tone === 'warning' ? (
        <>
          <path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
          <path d="M12 9v4.5M12 17h.01" />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="9.5" />
          <path d="M12 11v5.5M12 7.6h.01" />
        </>
      )}
    </svg>
  )
}
