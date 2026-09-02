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
 *
 * ## `Switch user` now switches user
 *
 * It called `navigate('/admin/team')` — a menu item that took the operator to
 * an unrelated screen and left them to work out that it had not done what it
 * said. `switchMockUser` (`clients/session.ts`) existed with **zero callers**
 * and is exactly this control's operation, so the item is now a submenu of the
 * seeded operators and choosing one re-reads the session.
 *
 * **It is mock-only by contract**, and the client says so: in `http` mode this
 * is impersonation and belongs to a real, audited endpoint that does not exist.
 * §11.2 governs the difference — the item is **disabled in place with the
 * reason rendered as a second line**, never hidden, because absence is not an
 * explanation and an operator looking for the control needs to know it exists
 * and why it will not work.
 */

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useRef, useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DATA_SOURCE, listTeamUsers } from '@/data/clients'
import type { Session, TeamUser } from '@/data/types'
import { useAsync } from '@/hooks'
import { isLanguage, type Language, type Translate } from '@/lib'

export interface AccountMenuProps {
  session: Session | null
  t: Translate
  /** The live language, so the radio group reflects state rather than owning it. */
  language: Language
  /** AC-70's only production entry point. `AppLayout` forwards `setLanguage`. */
  onSetLanguage: (language: Language) => void
  onOpenMyProfile: () => void
  /**
   * **Takes the id now.** It used to take nothing, because it navigated
   * somewhere instead of switching anybody. `AppLayout` calls
   * `switchMockUser` with it.
   */
  onSwitchUser: (userId: string) => void
  onSignOut: () => void
  /**
   * §10.4's account-menu entry — **present at all times, for every role**
   * (**AC-598**), and the keyboard path into the layer (**AC-613**).
   */
  onOpenOnboarding: () => void
  /**
   * `{done} / {total}` while the track is incomplete **and** undismissed;
   * **no indicator otherwise** (**AC-599**). `null` covers three different
   * situations that all render the same way — dismissed, complete, and not yet
   * loaded — because the menu's job is to advertise outstanding work and there
   * is none in any of the three.
   *
   * This is also where **AC-612**'s decision lands: an auto-completed step
   * produces **no toast**. The standing signal is this count, which is where
   * R10 routes a standing condition.
   */
  onboardingProgress: { done: number; total: number } | null
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
  onOpenOnboarding,
  onboardingProgress,
}: AccountMenuProps) {
  const name = session?.name ?? ''

  /* The roster is only read while the menu is open. A list of operators is not
     something the top bar needs at boot, and `enabled` is what keeps it off the
     critical path. */
  const [menuOpen, setMenuOpen] = useState(false)
  const canSwitch = DATA_SOURCE === 'mock'
  const operators = useAsync<TeamUser[]>((signal) => listTeamUsers(signal), {
    deps: [],
    /* `listTeamUsers` takes no argument but the signal, so `[]` is the whole
       key — and it is deliberately the same key `ApplicationsView` uses for the
       same parameterless roster read. Re-opening the menu is then free. */
    cacheKey: 'session.teamUsers',
    enabled: menuOpen && canSwitch,
  })

  /* Set only by an item that opens a layer. See the D-11 note below. */
  const handedOff = useRef(false)

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
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

      {/**
        * **D-11 — the layer wins.** A menu that hands off does not take focus back.
        *
        * Radix returns focus to the trigger in `onCloseAutoFocus`, which is right
        * for an item that acts in place and wrong for one that opens a layer:
        * measured in the production build, focus lands on the sheet title at t=0,
        * on `body` at ~50ms, and back on this trigger at ~150ms **while the drawer
        * is still open**. The operator is then tabbing through the page behind the
        * thing they just opened.
        *
        * **Conditional, never blanket.** Suppressing the restore for every close
        * would break Escape and every item that acts in place — those must return
        * the operator to where they were. The ref is set only by an item that
        * hands off. `02-shell-fixes.md` §13 left this open for a ruling; the
        * ruling is that the layer wins.
        *
        * **The braces are load-bearing.** Without them this block is a JSX CHILD,
        * and React renders the comment as text — it shipped as a 376x880px slab
        * of prose inside `<header>` on 35 of 35 routes, covering Export CSV on
        * every index screen and the first KPI tile on the management board.
        * Caught by the visual audit, not by `tsc`, and not by 3,075 tests.
        */}
      <DropdownMenuContent
        align="end"
        className="min-w-48"
        onCloseAutoFocus={(event) => {
          if (!handedOff.current) return
          handedOff.current = false
          event.preventDefault()
        }}
      >
        {/* Identity, not an action. `DropdownMenuLabel` is not focusable. */}
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-foreground">{name}</span>
          <span className="text-xs font-normal text-muted-foreground">{session?.role ?? ''}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* §10.4 — **permanent, for every role**, above `My profile` exactly as
            the design's menu sketch has it. The count sits at the inline-end,
            12px `--ev-text-2`, and disappears when there is nothing outstanding
            (**AC-599**) rather than reading `7 / 7`. */}
        <DropdownMenuItem onSelect={() => { handedOff.current = true; onOpenOnboarding() }}>
          {t('onboarding.menuEntry')}
          {onboardingProgress !== null && (
            <span className="ms-auto text-xs text-muted-foreground">
              {t('onboarding.menuCount', onboardingProgress)}
            </span>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => { handedOff.current = true; onOpenMyProfile() }}>{t('shell.account.myProfile')}</DropdownMenuItem>
        {canSwitch ? (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>{t('shell.account.switchUser')}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="min-w-56">
              {/* The submenu's own four states. A roster that will not load
                  must not render as an empty menu that looks like "there is
                  nobody else" (§5.4 — an end of list is stated in words). */}
              {operators.status === 'loading' && (
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  {t('shell.account.switchLoading')}
                </DropdownMenuLabel>
              )}
              {operators.status === 'error' && (
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  {t('shell.account.switchError')}
                </DropdownMenuLabel>
              )}
              {operators.status === 'empty' && (
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  {t('shell.account.switchEmpty')}
                </DropdownMenuLabel>
              )}
              {/* Exclusive, and `aria-checked` is what says which operator is
                  live — the same reason the language control is a radio group
                  and not two items. */}
              {operators.status === 'content' && operators.data !== null && (
                <DropdownMenuRadioGroup
                  value={session?.userId ?? ''}
                  onValueChange={(next) => {
                    if (next !== session?.userId) onSwitchUser(next)
                  }}
                >
                  {operators.data.map((operator) => (
                    <DropdownMenuRadioItem key={operator.id} value={operator.id}>
                      <span className="flex flex-col gap-0.5">
                        <span>{operator.name}</span>
                        <span className="text-xs text-muted-foreground">{operator.role}</span>
                      </span>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ) : (
          /* §11.2 — disabled IN PLACE, with the reason on a second line inside
             the item (§8.4.4). Not a tooltip (§5.7), and not hidden. */
          <DropdownMenuItem disabled className="flex-col items-start gap-0.5">
            <span>{t('shell.account.switchUser')}</span>
            <span className="text-xs text-muted-foreground">
              {t('shell.account.switchUnavailable')}
            </span>
          </DropdownMenuItem>
        )}

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
