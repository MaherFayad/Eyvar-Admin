/**
 * The analyst's command-palette entry point, AC-1262. The other three
 * entry points `01-analyst-agent.md` §4 names live in files another work
 * package owns, deferred to the handoff. Global, like `sessionCommands.ts`:
 * no record, so no `TARGET_SOURCES` entry.
 */

import { SparklesIcon } from 'lucide-react'
import type { Command, CommandRegistry } from './registry'

/** `?view=analyst` — a control on the Reports sub-tab, not a route of its own (`views.ts`). */
const ANALYST_VIEW_PATH = '/management/reports?view=analyst'

const askTheAnalyst: Command<never> = {
  id: 'analyst.ask',
  /* `an.compose.ask` is the one label every entry point in §4's table
     shares — the copy comment at its declaration says so. */
  titleKey: 'an.compose.ask',
  section: 'go',
  keywords: [
    'ask the analyst',
    'analyst',
    'ask a question',
    'case study',
    'اسأل المحلل',
    'المحلل',
    'اطرح سؤالاً',
  ],
  icon: SparklesIcon,
  scope: { kind: 'global' },
  affordance: 'default',
  arity: 'immediate',
  unavailable: (ctx) => (ctx.host.navigate === undefined ? ctx.t('an.compose.ask.unwired') : null),
  run(ctx) {
    ctx.host.navigate?.(ANALYST_VIEW_PATH)
    /* No outcome to toast: the command only navigated (`registry.ts`'s own
       words for `run`'s return type). */
  },
}

export const ANALYST_COMMANDS: CommandRegistry<never> = [askTheAnalyst]
