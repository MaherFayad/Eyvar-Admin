/**
 * Skeleton — restyled for Eyvar. The primitive only.
 *
 * `LoadingSkeleton` (B-04) composes it into ONE VARIANT PER PATTERN — §6.4's
 * ten rows plus the overlay — and that is where the shapes live. This file
 * only supplies the bar.
 *
 * Rules applied
 *   states.md / AC-35
 *               shaped like the content it replaces. NEVER a centred spinner,
 *               and never one generic block reused for every pattern.
 *   §11.3 / SH  the SHELL is never a skeleton: workspace and sub-tab LABELS
 *               render immediately from the route table. Only the COUNT
 *               BADGES are skeletons (spec §9.1).
 *   §7.6 / AC-69
 *               `animate-pulse` is an indefinite loop, so it is killed by the
 *               `prefers-reduced-motion` guard in `globals.css`. R18 is not
 *               breached: this loop signals "still arriving", not severity.
 *   a11y        `aria-hidden` — a skeleton is not content, and a screen reader
 *               announcing eight empty bars is worse than silence. The loading
 *               state is announced once through `LiveRegionAnnouncer` (S-08).
 *
 * `bg-muted` (`--ev-bg2`) is invisible on a white card, so the fill is
 * `bg-border` (`--ev-hairline`) — still a token, and legible on both
 * `--ev-surface` and `--ev-bg`. `rounded-sm` (4px), because a skeleton
 * stands in for a line of text, not for a card.
 */
import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("animate-pulse rounded-sm bg-border", className)}
      {...props}
    />
  )
}

export { Skeleton }
