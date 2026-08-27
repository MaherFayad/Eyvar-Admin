/**
 * `AuthWordmark` — design §2.2. **The one new composition this build needs.**
 *
 * `EyvarMark` at 24 px plus the word `Eyvar` at `--text-base` 15/600
 * `--ev-ink`, 8 px gap.
 *
 * Rules applied
 *   §2.2        the mark is the rail's mark, imported rather than redrawn.
 *               `ModuleRail` kept it private and there was one consumer; there
 *               are two now, so it is exported from there rather than copied.
 *               A second SVG of the same logo is a second logo the day one of
 *               them is edited.
 *   §9.5 / rtl  **the mark GLYPH does not mirror** — it is brand. The **pair**
 *               sits at the card's inline-start in both languages, which is
 *               what `flex` plus a logical parent alignment gives for free.
 *   §12         the word `Eyvar` is a proper noun and is deliberately NOT a
 *               translation key. It is the same six letters in both languages,
 *               and keying it would invite somebody to transliterate it in one
 *               dictionary and not the other.
 *   §7.2        it is not interactive. There is nowhere to go from an auth card
 *               and a logo that navigates to `/` on an unauthenticated page is
 *               a link into a redirect. No `<a>`, no tab stop, no focus ring —
 *               and the mark carries `aria-hidden`, so the accessible name of
 *               the block is the word, once, not "Eyvar Eyvar".
 */

import { EyvarMark } from '@/shell/ModuleRail'

export function AuthWordmark() {
  return (
    <div className="flex items-center gap-2 text-foreground">
      <EyvarMark />
      <span className="text-base font-semibold text-foreground">Eyvar</span>
    </div>
  )
}
