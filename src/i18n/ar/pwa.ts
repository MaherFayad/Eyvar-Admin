/**
 * Arabic - the install prompt (src/pwa/copy.ts).
 *
 * Emitted as one flat `Dictionary` so a reviewer reads a key beside its string
 * and nothing else. Every key here exists in the English dictionary of the same
 * name; `src/i18n/ar/index.ts` spreads this into `AR` in the same order
 * `dictionaries.ts` spreads the English side, so a duplicated key resolves the
 * same way in both languages.
 *
 * Conventions this file follows, from `design/20-arabic-glossary.md`:
 * Arabic punctuation (R1), the terminal full stop last (R2), one MSA register
 * (R3), Latin proper nouns and acronyms left alone (R4), masdar on buttons (R6),
 * and Western digits (R8). A plural family carries all six CLDR categories -
 * `zero one two few many other` - because Arabic marks exactly-two
 * grammatically and an English pair is wrong at 2.
 */

import type { Dictionary } from '@/lib'

export const PWA_AR: Dictionary = {
  'pwa.install.title': 'تشغيل اللوحة في نافذة مستقلة',
  'pwa.install.body': 'النافذة المثبَّتة تُخفي شريط أدوات المتصفح وتعيد نحو 90 بكسل — أي صفًّا إضافيًا في الجدول تقريبًا.',
  'pwa.install.action': 'تثبيت',
  'pwa.install.dismiss': 'تجاهل',
}
