/**
 * The auth card — design §2.1, §2.2. **One anatomy, six screens.**
 *
 * ```
 * ┌─ 400 ──────────────────────────────┐  --ev-surface, --ev-hairline,
 * │  32                                │  r8, --ev-shadow-2
 * │   ▣ Eyvar          wordmark        │
 * │   Sign in          h1  22/28       │
 * │   …subtitle        13/20 text-2    │
 * │   [ BANNER SLOT — at most one ]    │
 * │   …fields…                         │
 * │   [ full-width primary, 40px ]     │
 * │   Privacy  Terms   12px, start     │
 * └────────────────────────────────────┘
 * ```
 *
 * Rules applied
 *   AC-500      **no chrome.** No rail, no sub-tab column, no top bar, no shell
 *               banner strip, no toast region. None of the three is in the DOM,
 *               which is why the auth routes are siblings of `AppLayout` in
 *               `routes.tsx` rather than children of it — a `hidden` class would
 *               leave all three in it.
 *   §2.1        ground `--ev-bg2` (`bg-muted`), flat, full-bleed. No gradient,
 *               no image, no second skin.
 *   §2.1        card **400 px fixed, never fluid** — `w-100`. 32 px padding all
 *               round → a 336 px content column.
 *   §2.1        **short viewport**: when the viewport is shorter than the card
 *               plus 96 px, the ground scrolls and the card takes 48 px block
 *               padding, top-aligned. It never clips and never centres itself
 *               off-screen. `overflow-y-auto` + `py-12` + `justify-center` on a
 *               flex column does exactly that with no measurement and no
 *               listener: `justify-center` degrades to start-alignment once the
 *               content exceeds the box, and the padding survives the overflow
 *               because it is the flex parent's.
 *   §2.2        exactly **one `<h1>` per card**, and it is the accessible name
 *               of the surface — `aria-labelledby` on the `<main>` landmark.
 *   §2.3        **one banner position, ever**, between the subtitle and the
 *               first label. `AuthBanner` resolves which one; this renders the
 *               slot.
 *   §2.1        **there is no toast on any auth screen.** There is no shell to
 *               host one, and every event here is either a standing condition
 *               (banner) or a field problem (inline). Recorded because `sonner`
 *               is globally mounted and an engineer will reach for it.
 *   §1.3        the legal row renders **only the links the `legal` pane
 *               provides**, and when it provides none the row is not rendered
 *               at all — no empty row, no dead link. `Help` is not among them:
 *               Eyvar has no help centre. This is what **AC-503**'s trailing
 *               clause (spec §19.3 C-1) exists for.
 *   R-3 tier 2  `--ev-shadow-2`, pre-assigned in `00-decisions-r3.md` §1.2.
 *   §9 / rtl    every utility is logical, so the card mirrors with no second
 *               rule. It does **not** widen in Arabic — only the eight
 *               dimensions in `03-navattic-language.md` §1.7 step up, and the
 *               card is not one of them (**AC-673**).
 */

import type { ReactNode } from 'react'
import { AuthWordmark } from './AuthWordmark'
import { AuthPrimary } from './AuthFields'

export interface LegalLink {
  id: string
  label: string
  href: string
}

export interface AuthCardProps {
  /** The `<h1>`. Exactly one, and it names the surface. */
  title: string
  /** A fragment (no period) unless it is a sentence, per R6. `null` renders nothing. */
  subtitle?: ReactNode
  /** §2.3's slot. At most one banner; the caller has already resolved which. */
  banner?: ReactNode
  children: ReactNode
  /** §1.3 — an empty list renders **no row at all**, not an empty one. */
  legal?: readonly LegalLink[]
}

const TITLE_ID = 'auth-card-title'

/**
 * The banner slot's DOM id, so a disabled control can point
 * `aria-describedby` at the sentence that explains it.
 *
 * **AC-512** — *"the primary is disabled with the reason named"* — needs the
 * reason to be programmatically associated, not merely adjacent. The id is on
 * the **wrapper** rather than on the `Alert`, because `Banner` owns the
 * `Alert`'s attributes and a second consumer reaching in to set one is how two
 * screens end up with the same id.
 */
export const AUTH_BANNER_SLOT_ID = 'auth-card-banner'

export function AuthCard({ title, subtitle, banner, children, legal = [] }: AuthCardProps) {
  return (
    /* The ground. `min-h-screen` rather than `h-screen` so a tall card grows
       the scroll container instead of being clipped by it (§2.1's short
       viewport). */
    <div className="flex min-h-screen w-full flex-col items-center justify-center overflow-y-auto bg-muted px-4 py-12">
      <main
        aria-labelledby={TITLE_ID}
        className="w-100 shrink-0 rounded-xl border border-border bg-card p-8 shadow-2"
      >
        <AuthWordmark />

        {/* 24 above the h1, per §2.2's stack. */}
        <h1 id={TITLE_ID} className="mt-6 text-xl font-semibold text-foreground">
          {title}
        </h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}

        {/* §2.3 — the banner slot. 20 below the subtitle, 16 above the first
            label, which is the `mt-5` here plus the form's own `mt-4`. */}
        {banner ? (
          <div id={AUTH_BANNER_SLOT_ID} className="mt-5">
            {banner}
          </div>
        ) : null}

        <div className="mt-4">{children}</div>

        {/* §1.3 — no links, no row. Not an empty row and not a dead `Help`. */}
        {legal.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-4 text-start">
            {legal.map((link) => (
              <a
                key={link.id}
                href={link.href}
                /* R3 — blue no longer carries a primary, so a link on white is
                   `--ev-blue-dk` plus an underline. 12 px, `--ev-text-2` is the
                   ROW's colour; the links themselves take the link colour. */
                className="rounded-sm text-xs text-info-foreground underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

/**
 * The three whole-card replacements — `challenge-missing` (§4.5),
 * `reset-token-invalid` (§7.3) and `invite-token-invalid` (§7.4).
 *
 * **The card is replaced, not bannered.** A banner above an absent form is
 * nonsense: it summarises a thing that is not there. And **AC-581** forbids a
 * dead end, so each of the three states carries the exit as a control, not only
 * as a sentence.
 */
export function AuthCardReplacement({
  title,
  body,
  action,
  legal,
}: {
  title: string
  body: string
  action: { label: string; onClick: () => void; emphasis?: 'primary' | 'plain' }
  legal?: readonly LegalLink[]
}) {
  return (
    <AuthCard title={title} legal={legal}>
      <p className="text-sm text-muted-foreground">{body}</p>
      <div className="mt-5">
        {action.emphasis === 'plain' ? (
          <button
            type="button"
            onClick={action.onClick}
            className="rounded-sm text-xs text-info-foreground underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            {action.label}
          </button>
        ) : (
          <AuthPrimary label={action.label} onClick={action.onClick} />
        )}
      </div>
    </AuthCard>
  )
}
