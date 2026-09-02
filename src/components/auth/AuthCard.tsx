/**
 * The auth card — design §2.1, §2.2. **One anatomy, six screens.**
 *
 * ```
 *  ≥768                              <768 (`compact:`)
 * ┌──────────────┬─────────────────┐  ┌─────────────────┐
 * │ BRAND PANEL  │  FORM PANEL     │  │  ▣ Eyvar        │
 * │ 5/12, max-xl │  --ev-surface   │  │  Sign in        │
 * │ --primary    │                 │  │  …subtitle      │
 * │              │  ┌─ 400 ─────┐  │  │  [ BANNER ]     │
 * │ ▣ Eyvar      │  │ Sign in   │  │  │  …fields…       │
 * │              │  │ …subtitle │  │  │  [ primary ]    │
 * │ "Dispatch,   │  │ [BANNER]  │  │  │  Privacy Terms  │
 * │  subscript…" │  │ …fields…  │  │  └─────────────────┘
 * │              │  │ [primary] │  │
 * │ console      │  │ Privacy   │  │  The brand panel is not
 * └──────────────┴──└───────────┘──┘  rendered at all below 768.
 *   ruled at --ev-row-h x --ev-rail-w
 *   in its own foreground at 10%
 * ```
 *
 * **The 400px content column is unchanged in both.** What moved is what is
 * around it — see the long note at the component for which half of §2.1 was
 * retired, which half still binds, and why the front door is the one surface
 * in this product where the brand may be spent.
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
import { EyvarMark } from '@/shell/ModuleRail'
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
 * The brand panel's two lines.
 *
 * **Not translated, and that is a decision rather than an omission.** Both are
 * inside an `aria-hidden` panel that is not rendered below 768px at all, so
 * neither is ever announced and neither is ever the only carrier of anything —
 * every word an operator must READ to sign in is in the form panel and comes
 * from a key. Putting these through `t` would add two rows to a ~4,300-key
 * translation pass to change decoration nobody hears.
 *
 * The enumeration is the product's own copy voice — concrete nouns, no
 * adjectives, terminal full stop — matching lines like *"Everyone who can sign
 * in, the role they hold, and how much they may compensate a rider without
 * asking."* If this ever moves into the form panel, or stops being
 * `aria-hidden`, it needs keys first.
 */
const BRAND_LINE = 'Dispatch, subscriptions, payouts, and the queues behind them.'
const BRAND_FOOT = 'Eyvar operations console'

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
    /* ── THE TWO-PANEL SURFACE. §2.1 AMENDED, 2026-09-02, ON THE OWNER'S
       INSTRUCTION ("the login flow I want it to look amazingly good").

       WHAT §2.1 SAID, and it is worth being exact about which half moves:
         "ground --ev-bg2, flat, full-bleed. No gradient, no image, no second
          skin" · "card 400px fixed, never fluid"

       THE HALF THAT IS RETIRED — the 400px box floating on a grey field. That
       shape is the product's least considered surface and it is the FIRST one
       an operator ever sees. Every reason the working screens are austere —
       density, scan speed, eight hours a day — applies to none of it: nobody
       reads a table here and nobody is under time pressure. The front door is
       the one place in this product where the brand may be spent.

       THE HALF THAT BINDS, UNCHANGED AND ENFORCED BELOW:
         · **No gradient, no image, no second skin.** The brand panel is ONE
           flat fill, `--primary`, which is a token this file did not invent.
           There is no photograph, no mesh, no glass and no glow.
         · The content column is still a FIXED measure (`w-100`, 400px) and
           still never fluid — it is now centred inside a panel instead of
           being a box on a ground, but a form field is exactly as wide as it
           was and every screen inside it is untouched.
         · AC-500's "no chrome" is untouched: still no rail, no top bar, no
           toast region, and this is still a sibling of `AppLayout`.
         · §2.1's short-viewport behaviour is untouched — see the form panel.

       THE GRATICULE, and why it is not decoration. The brand panel is ruled
       with the CONSOLE'S OWN GRID: horizontal lines at 40px, which is
       `--ev-row-h`, the product's table row pitch, and vertical lines at 80px,
       which is `--ev-rail-w`. It is drawn at 7% of the panel's own foreground,
       so it reads as texture rather than as a chart. The front door is
       literally the surface the console is built on. It is two
       `repeating-linear-gradient`s and no image, which is also what keeps the
       "no image, no second skin" clause true rather than merely respected in
       spirit.

       ARABIC: the panel is placed by GRID ORDER, not by a side, so it mirrors
       with the document and needs no second rule — same discipline as the rest
       of the file, and the auth suite's physical-utility scan enforces it. */
    <div className="flex min-h-screen w-full bg-card">
      {/* ── THE BRAND PANEL. Hidden below 768 via `compact:` — the product declares exactly two
          variants and `md:` is not one of them. Below it the width does not exist
          and the form is the only thing that matters. `aria-hidden` because
          every word in it is decoration or is repeated by the form panel — a
          screen reader should land on the `<h1>`, not on a tagline. */}
      <aside
        aria-hidden="true"
        className="relative flex w-5/12 max-w-xl shrink-0 flex-col justify-between overflow-hidden bg-brand-field p-10 text-brand-field-foreground compact:hidden"
      >
        {/* The console's own grid, at 7%. See the header. `inset-0` is a
            logical-safe utility — it sets all four insets, so there is no
            direction to get wrong. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'repeating-linear-gradient(to bottom, currentColor 0 1px, transparent 1px var(--ev-row-h)), repeating-linear-gradient(to right, currentColor 0 1px, transparent 1px var(--ev-rail-w))',
          }}
        />

        <div className="relative flex items-center gap-2.5">
          {/* `stroke-primary` — the glyph is cut out of a white square on the
              brand field. See `EyvarMark` for why the override exists. */}
          <EyvarMark className="size-7" strokeClassName="stroke-brand-field" />
          <span className="text-lg font-semibold">Eyvar</span>
        </div>

        <p className="relative max-w-xs text-xl leading-snug font-semibold text-balance">
          {BRAND_LINE}
        </p>

        {/* The panel's foot. Deliberately empty of controls: nothing here is
            actionable, so nothing here is focusable, which is what lets the
            whole panel be `aria-hidden` without hiding a control from anyone. */}
        <span className="relative text-xs opacity-70">{BRAND_FOOT}</span>
      </aside>

      {/* ── THE FORM PANEL. §2.1's short-viewport rule, unchanged and for the
          same reason: `overflow-y-auto` + block padding + `justify-center` on a
          flex column degrades to start-alignment once the content exceeds the
          box, so a tall card never centres itself off-screen and never clips. */}
      <div className="flex min-w-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-12">
        <main aria-labelledby={TITLE_ID} className="w-100 max-w-full shrink-0">
          {/* The wordmark is the form panel's own, and it is the ONLY one below
              768 where the brand panel is not rendered. Above 768 it would be
              the second Eyvar on screen, so it goes. */}
          <div className="hidden compact:block">
            <AuthWordmark />
          </div>

          {/* 24 above the h1, per §2.2's stack — and 0 above it when the
              wordmark is not rendered, because there is nothing to sit under. */}
          <h1 id={TITLE_ID} className="text-xl font-semibold text-foreground compact:mt-6">
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
