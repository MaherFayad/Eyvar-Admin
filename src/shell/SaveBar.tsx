/**
 * `SaveBar` (S-04) — design spec §4.1, spec §2.3, **AC-51**, **AC-52**.
 *
 * **Replaces the top bar IN PLACE, at identical height, with no layout shift.**
 * That is AC-51 and it is a one-line requirement with a real consequence: the
 * two bars share `--ev-topbar-h` (**52px** under D7, both languages), and
 * `AppLayout`
 * renders exactly one of them in the same slot. Nothing is stacked, nothing is
 * absolutely positioned over anything, and the content below does not move by
 * one pixel.
 *
 * **Both nav columns stay mounted and are NOT dimmed** (§4.1). Dimming the nav
 * during an edit is how an operator loses the ability to see the backlog they
 * are editing against.
 *
 * **The state comes from `useForm`, and this file does not recompute it.**
 * `status` is `FormStatus`, mapping 1:1 onto §11.6 rows 5–9; the enabled state
 * of each button is `form.canSave` / `form.canDiscard` / `form.isSaving`. A
 * screen that re-derives them from `isDirty` and `errors` is how rows 6 and 7
 * drift apart — and `canDiscard` is never gated on validity (**AC-52**).
 *
 * Rules applied
 *   §2.3        inline-start: the dirty label, 13px/600. **Entity-specific**
 *               when editing a named record (`Unsaved plan`), `Unsaved changes`
 *               otherwise. **No warning glyph** — the word carries it, and an
 *               amber glyph here would read as a banner.
 *   §2.3 / R2   inline-end: `Discard` (secondary) then `Save` (**the primary**,
 *               never green, never white-on-white). R2 is AMENDED by D7: Save
 *               is still the same primary as every other primary, and that
 *               primary is now NEAR-BLACK, not brand blue. D-1 is void and R3
 *               is killed — `--primary` maps to `--ev-ink`. One colour name
 *               changed; the reasoning did not.
 *   AC-52       `dirty-invalid` → `Save` disabled, `Discard` still ENABLED.
 *   §9.2 #7     `save-in-flight` → `Save` shows an inline progress indicator
 *               and is not re-triggerable; `Discard` is disabled for the
 *               duration; and the live region announces `Saving`. The
 *               announcement is made HERE because §11.6 row 7 names it as
 *               shell copy, and because announcing is what a surface does IN
 *               ADDITION to rendering (§7.5), never instead of it.
 *   §9.2 #8/#9  `save-failed` keeps the bar UP. The page-level critical banner
 *               that must accompany it belongs to the form's own page, not to
 *               the shell — a toast alone is insufficient (R10, **AC-55**).
 *   §4.1        the back arrow, title pair, search, both chips, bell and avatar
 *               are all REMOVED for the duration. The bar carries two things.
 *   §4.1        **the logo does not go in the inline-start slot.** §2.3
 *               requires it; §6.2 D-3 already voids that rule for Eyvar because
 *               the wordmark lives in the rail. Restated so nobody "restores" it.
 *   §4.6        `disabled` means "this will become available", which is exactly
 *               what `Save` means here — it is not expressing a permission.
 *   R-3 §1.3    the save bar carries NO elevation, explicitly listed in the
 *               tier table. It is the top bar's replacement, not a surface
 *               floating over it.
 */

import { useEffect, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useAnnounce } from '@/hooks'
import type { Translate } from '@/lib'
import type { SaveBarModel } from './ShellContext'

export interface SaveBarProps {
  model: SaveBarModel
  t: Translate
  /**
   * §8.1's freeze and §8.5's `write-permission-revoked-while-dirty` — **two
   * different causes, one treatment on this bar**:
   *
   * > `Save` **disabled**, `aria-describedby` → the banner. `Discard` **stays
   * > enabled**. The form's content stays on screen and **selectable**.
   *
   * `Discard` staying enabled is the load-bearing half and it is easy to lose:
   * **AC-52** already says `canDiscard` is *never* gated on validity, and this
   * adds that it is never gated on permission or on the freeze either. The
   * operator has a screen full of work they can no longer save; taking away
   * the only control that ends the state would leave them with a page they can
   * neither commit nor leave.
   */
  blockedReasonId?: string | null
  /**
   * The compact shell's navigation control, or `null` above the breakpoint.
   *
   * It is on THIS bar as well as the top bar, and that is a requirement rather
   * than symmetry. §4.1 / AC-51: while the save bar is up *"both nav columns
   * stay mounted and are **not** dimmed"* — the operator can still navigate
   * with work in progress, and the sign-out and route-change paths are built
   * around that being possible. Below the breakpoint the nav columns are not on
   * screen and this control is the only thing that brings them back, so
   * omitting it here would silently make a dirty form on a phone a state with
   * no navigation at all: the one place in the product an operator can be
   * genuinely stuck.
   */
  menu?: ReactNode
}

export function SaveBar({ model, t, blockedReasonId = null, menu = null }: SaveBarProps) {
  const announce = useAnnounce()

  /* §11.6 row 7 — the live region announces `Saving`. One region, module
     singleton (**AC-29**); the string is copy, so it goes through a key. */
  useEffect(() => {
    if (model.status === 'save-in-flight') announce(t('shell.saveBar.saving'))
  }, [model.status, announce, t])

  return (
    <div
      /* Identical height to the top bar, in the same slot. AC-51. */
      className="flex h-topbar shrink-0 items-center gap-3 border-b border-border bg-background px-4"
    >
      {menu}
      {/* §2.3 — the word carries the warning. No glyph. */}
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
        {model.entity
          ? t('shell.saveBar.dirtyEntity', { entity: model.entity })
          : t('shell.saveBar.dirty')}
      </span>

      <div className="flex shrink-0 items-center gap-2">
        {/* AC-52 — enabled state comes straight from the form, and **AC-586**:
            it is not gated on permission or on the freeze either. */}
        <Button variant="secondary" onClick={model.onDiscard} disabled={!model.canDiscard}>
          {t('shell.saveBar.discard')}
        </Button>
        {/* R2 as amended by D7 — `bg-primary`, which is near-black now. Not
            re-triggerable while in flight, and **gated at render** rather than
            refused at commit (foundation §11.2, **AC-667**): the reason is
            programmatically attached, not discovered by pressing it. */}
        <Button
          variant="default"
          onClick={model.onSave}
          disabled={!model.canSave || blockedReasonId !== null}
          aria-describedby={blockedReasonId ?? undefined}
        >
          {model.isSaving && <Spinner />}
          {t('shell.saveBar.save')}
        </Button>
      </div>
    </div>
  )
}
