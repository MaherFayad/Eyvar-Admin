/**
 * The analyst's command-palette entry, AC-1262. `EN`/`createTranslator` is
 * the same pair `domains.test.ts` uses, so `titleKey` resolves through the
 * real dictionary rather than a private fixture.
 */

import { describe, expect, it } from 'vitest'
import { EN } from '@/i18n/dictionaries'
import { createTranslator } from '@/lib'
import { ANALYST_COMMANDS } from './analyst'
import type { CommandContext, CommandHost } from './registry'

const t = createTranslator({ dictionary: EN })

function context(host: CommandHost): CommandContext<never> {
  return { targets: [], t, language: 'en', session: { canWrite: true }, host }
}

const askTheAnalyst = ANALYST_COMMANDS[0]!

describe('AC-1262 — the analyst has a command-palette entry', () => {
  it('resolves its label through the real dictionary, not a raw key', () => {
    expect(t(askTheAnalyst.titleKey)).toBe('Ask the analyst')
  })

  it('is global, so ⌘K can offer it with nothing selected', () => {
    expect(askTheAnalyst.scope).toEqual({ kind: 'global' })
    expect(askTheAnalyst.arity).toBe('immediate')
  })

  it('navigates to the analyst view when the host is wired', () => {
    const seen: string[] = []
    const host: CommandHost = {
      openProfile: () => {},
      confirm: () => Promise.resolve(null),
      navigate: (path) => seen.push(path),
    }
    expect(askTheAnalyst.unavailable?.(context(host))).toBeNull()
    void askTheAnalyst.run(context(host))
    expect(seen).toEqual(['/management/reports?view=analyst'])
  })

  it('refuses with a stated reason when the host has no navigate', () => {
    const host: CommandHost = { openProfile: () => {}, confirm: () => Promise.resolve(null) }
    const reason = askTheAnalyst.unavailable?.(context(host))
    expect(reason).toBe(t('an.compose.ask.unwired'))
  })
})
