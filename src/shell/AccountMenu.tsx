/**
 * `AccountMenu` (S-07) — design spec §4, slot 4d.
 *
 * **The single entry point to `my-account`.** Legacy has two, in two chrome
 * regions — the rail footer (`:544`) and the top-bar avatar (`:577`) — which is
 * **D-L10**, and the rail footer identity block is deleted for exactly that
 * reason. One affordance, one place.
 *
 * Rules applied
 *   §4 slot 4d  the avatar is a 28px **rounded square**, radius 8px — NEVER a
 *               circle (R15). `avatar.tsx` was restyled on arrival for this.
 *   §4          the menu is a `dropdown-menu` aligned to the avatar: the
 *               operator's name and role as a non-interactive header, then
 *               `My profile` and `Switch user`, then a separator, then
 *               `Sign out`.
 *   §5.7        items are verb-first where they are actions, sentence case, no
 *               trailing punctuation.
 *   §4 / §6.4   `My profile` opens the shell layer at `?account=me`. It is not
 *               a route, so it does not navigate away from what the operator
 *               was doing.
 *   AC-65       the avatar is an icon-only control and carries an accessible
 *               name.
 *   §7.2        Radix owns the roving highlight inside the menu; the trigger
 *               keeps the standard 2px ring.
 *   AC-70       **the language control lives here.** §11.6 row 23
 *               (`language-switching`) describes what happens when the operator
 *               switches language and never says where they do it, and until
 *               this menu grew a radio group there was NO answer: `setLanguage`
 *               had zero production call sites, so `dir="rtl"` was reachable
 *               only by hand-editing the DOM and nobody had ever seen the
 *               product in Arabic. It is a `DropdownMenuRadioGroup`, not two
 *               items and not a toggle, because the choice is exclusive and
 *               `aria-checked` is what tells a screen reader which one is live.
 *               It sits ABOVE the `Sign out` separator so the destructive item
 *               stays last (§5.4).
 */

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Session } from '@/data/types'
import { isLanguage, type Language, type Translate } from '@/lib'

export interface AccountMenuProps {
  session: Session | null
  t: Translate
  /** The live language, so the radio group reflects state rather than owning it. */
  language: Language
  /** AC-70's only production entry point. `AppLayout` forwards `setLanguage`. */
  onSetLanguage: (language: Language) => void
  onOpenMyProfile: () => void
  onSwitchUser: () => void
  onSignOut: () => void
}

/** §9.1 — the two the product ships. Ordered `en` first, matching §14's default. */
const LANGUAGES: readonly Language[] = ['en', 'ar']

export function AccountMenu({
  session,
  t,
  language,
  onSetLanguage,
  onOpenMyProfile,
  onSwitchUser,
  onSignOut,
}: AccountMenuProps) {
  const name = session?.name ?? ''

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t('shell.topbar.account')}>
          {/* R15 — a rounded square. `avatar.tsx` ships `rounded-lg`; the size
              here is the top bar's 28px, which is `--ev-control-h`. */}
          <Avatar className="size-control">
            {session?.photoUrl && <AvatarImage src={session.photoUrl} alt="" />}
            <AvatarFallback>{initials(name)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-48">
        {/* Identity, not an action. `DropdownMenuLabel` is not focusable. */}
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-foreground">{name}</span>
          <span className="text-xs font-normal text-muted-foreground">{session?.role ?? ''}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onOpenMyProfile}>{t('shell.account.myProfile')}</DropdownMenuItem>
        <DropdownMenuItem onSelect={onSwitchUser}>{t('shell.account.switchUser')}</DropdownMenuItem>

        {/* AC-70 — the language control. `onValueChange` hands Radix's string
            back through `isLanguage` rather than casting it: the radio group's
            value type is `string`, and a cast here is how `setLanguage('EN')`
            would reach `directionFor` and silently resolve to `ltr`. */}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          {t('shell.account.language')}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={language}
          onValueChange={(next) => {
            if (isLanguage(next) && next !== language) onSetLanguage(next)
          }}
        >
          {LANGUAGES.map((code) => (
            <DropdownMenuRadioItem key={code} value={code}>
              {t(`shell.language.${code}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onSignOut}>{t('shell.account.signOut')}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Initials for the fallback. Legacy seeds all five operators with a `null`
 * photo (`:2831`), so **every avatar in the product is initials today** and
 * this path is the common one, not the exception.
 *
 * Not a translated string and not concatenation in the AC-75 sense: these are
 * characters taken out of a proper noun, not a sentence assembled from
 * fragments.
 */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase()
}
