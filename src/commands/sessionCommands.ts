/**
 * The shell's own settings, as commands — D9, F6, and the file
 * `design/05-command-centre.md` §2 sketched as `shell.ts`.
 *
 * `session.ts` is taken: it builds `CommandSession`, which is the Q4 seam. This
 * is the other thing with the same name — the commands an operator runs *on
 * their session* rather than on a record.
 *
 * ## Six commands, not three toggles
 *
 * `Switch language` as one row would tell an operator nothing about which
 * language it lands in, and a toggle cannot be refused with a reason. Declaring
 * both directions is §11.2's `:4113` argument in its plainest form: the legacy
 * roster renders `Reinstate account` **or** `Suspend account` and never both,
 * so an operator cannot see that the other exists. `Switch to English` is
 * present, disabled, and says *"You are already reading English."* — which is
 * information, where absence is a puzzle.
 *
 * ## Why the host does these and not the command
 *
 * Language, theme and sign-out are **shell state, not domain state**. A command
 * that imported the shell's stores would invert the layering (a screen consumes
 * a registry, never the other way round) and would drag React into a module
 * `registry.ts` deliberately keeps pure. So they are three optional methods on
 * `CommandHost`, and every command below **refuses with a keyed sentence when
 * the host lacks the one it needs** — so this registry lands before the surface
 * wires it and nothing crashes in between.
 *
 * **For the integrator:** `GlobalSearch` builds the host. `AppLayout` already
 * owns all three (`AppLayout.tsx:347` for language, `:693` for theme, `:194`
 * for sign-out — the one that asks about unsaved work first, which is why this
 * is the shell's and not `clients/auth`'s bare mutation).
 *
 * ## No undo, and none needed
 *
 * D18 is about mutations. Nothing here writes a record: switching language does
 * not change what is true, it changes what is drawn, and the inverse is the
 * command declared beside it — one keystroke away in the same palette.
 */

import { GlobeIcon, LogOutIcon, MonitorIcon, MoonIcon, SunIcon } from 'lucide-react'
import type { Command, CommandContext, CommandRegistry } from './registry'

/* ───────────────────────────── the refusals ───────────────────────────── */

/**
 * §11.2 — the sentence a command states when the shell has not wired its
 * capability. Never a hidden row and never a crash at the press.
 */
function needsHost<T>(
  ctx: CommandContext<T>,
  has: boolean,
  reasonKey: string,
): string | null {
  return has ? null : ctx.t(reasonKey)
}

/* ──────────────────────────────── language ──────────────────────────────── */

/**
 * `unavailable` here is domain state in the only sense a session has one: the
 * language you are already reading. **CQ-7 is untouched** — no role is
 * consulted, because there is no role that may not read Arabic.
 */
const toArabic: Command<never> = {
  id: 'session.arabic',
  titleKey: 'session.action.arabic',
  section: 'go',
  keywords: [
    'arabic',
    'switch to arabic',
    'change language',
    'rtl',
    'language',
    'اللغة العربية',
    'التحويل إلى العربية',
    'تغيير اللغة',
    'عربي',
  ],
  icon: GlobeIcon,
  scope: { kind: 'global' },
  affordance: 'default',
  arity: 'immediate',
  unavailable: (ctx) =>
    needsHost(ctx, ctx.host.setLanguage !== undefined, 'session.action.language.unwired') ??
    (ctx.language === 'ar' ? ctx.t('session.action.arabic.already') : null),
  run(ctx) {
    ctx.host.setLanguage?.('ar')
    /* No outcome: the whole page has just changed language, and a toast in the
       language you were reading a moment ago is furniture. */
  },
}

const toEnglish: Command<never> = {
  id: 'session.english',
  titleKey: 'session.action.english',
  section: 'go',
  keywords: [
    'english',
    'switch to english',
    'change language',
    'ltr',
    'language',
    'اللغة الإنجليزية',
    'التحويل إلى الإنجليزية',
    'تغيير اللغة',
    'إنجليزي',
  ],
  icon: GlobeIcon,
  scope: { kind: 'global' },
  affordance: 'default',
  arity: 'immediate',
  unavailable: (ctx) =>
    needsHost(ctx, ctx.host.setLanguage !== undefined, 'session.action.language.unwired') ??
    (ctx.language === 'en' ? ctx.t('session.action.english.already') : null),
  run(ctx) {
    ctx.host.setLanguage?.('en')
  },
}

/* ────────────────────────────────── theme ────────────────────────────────── */

/**
 * Three commands rather than a cycle, and `system` is one of them rather than
 * an absence — an operator whose machine switches at dusk has chosen that, and
 * a two-way toggle would take the choice away without saying so.
 *
 * **Not refused on the current theme.** The palette cannot read `ThemeChoice`
 * (that is the shell's store, and `CommandContext` carries the language but not
 * the theme), so re-picking the theme you are on is a no-op rather than a
 * refusal. Stated rather than glossed: closing it means a `theme` field on
 * `CommandContext`, which is a contract change for three rows.
 */
function themeCommand(
  id: `session.${string}`,
  key: string,
  value: 'light' | 'dark' | 'system',
  icon: Command<never>['icon'],
  keywords: readonly string[],
): Command<never> {
  return {
    id,
    titleKey: key,
    section: 'go',
    keywords,
    icon,
    scope: { kind: 'global' },
    affordance: 'default',
    arity: 'immediate',
    unavailable: (ctx) =>
      needsHost(ctx, ctx.host.setTheme !== undefined, 'session.action.theme.unwired'),
    run(ctx) {
      ctx.host.setTheme?.(value)
    },
  }
}

const themeLight = themeCommand(
  'session.themeLight',
  'session.action.themeLight',
  'light',
  SunIcon,
  ['light theme', 'light mode', 'day', 'brighten', 'theme', 'المظهر الفاتح', 'الوضع النهاري', 'إضاءة', 'مظهر'],
)

const themeDark = themeCommand(
  'session.themeDark',
  'session.action.themeDark',
  'dark',
  MoonIcon,
  ['dark theme', 'dark mode', 'night', 'dim', 'theme', 'المظهر الداكن', 'الوضع الليلي', 'تعتيم', 'مظهر'],
)

const themeSystem = themeCommand(
  'session.themeSystem',
  'session.action.themeSystem',
  'system',
  MonitorIcon,
  ['system theme', 'match system', 'automatic theme', 'os theme', 'theme', 'مظهر النظام', 'مطابقة النظام', 'تلقائي', 'مظهر'],
)

/* ───────────────────────────────── sign out ──────────────────────────────── */

/**
 * **Not red, and it does not confirm here.** Signing out is recoverable — you
 * sign back in — so R5a's red is not spent on it. The *unsaved work* question
 * is a different question and the shell already asks it
 * (`SignOutDirtyDialog`); asking a second one in the palette would mean two
 * dialogs for one act, and the second could not see the first's answer.
 */
const signOut: Command<never> = {
  id: 'session.signOut',
  titleKey: 'session.action.signOut',
  section: 'go',
  keywords: [
    'sign out',
    'log out',
    'logout',
    'leave',
    'end session',
    'تسجيل الخروج',
    'الخروج',
    'إنهاء الجلسة',
    'خروج',
  ],
  icon: LogOutIcon,
  scope: { kind: 'global' },
  affordance: 'default',
  arity: 'immediate',
  unavailable: (ctx) =>
    needsHost(ctx, ctx.host.signOut !== undefined, 'session.action.signOut.unwired'),
  run(ctx) {
    ctx.host.signOut?.()
  },
}

/**
 * The session registry, in the order the account menu already lists them:
 * language, theme, then the door.
 */
export const SESSION_COMMANDS: CommandRegistry<never> = [
  toArabic,
  toEnglish,
  themeLight,
  themeDark,
  themeSystem,
  signOut,
]
