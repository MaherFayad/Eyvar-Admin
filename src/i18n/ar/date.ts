/**
 * Arabic - the relative-age strings (src/lib). Every key exists in
 * `DATE_MESSAGES_EN`; `src/i18n/ar/index.ts` spreads this into `AR`. The unit
 * letters stay Latin, as `sla.ts`'s `{duration}` already reads `14m` in Arabic
 * (glossary R4, Western digits R8).
 */

import type { Dictionary } from '@/lib'

export const DATE_MESSAGES_AR: Dictionary = {
  'date.age.now': 'الآن',
  'date.age.minutes': '{count}m',
  'date.age.hours': '{count}h',
  'date.age.days': '{count}d',
}
