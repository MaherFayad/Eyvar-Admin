/**
 * Arabic — the file-size unit strings (src/lib).
 *
 * Emitted as one flat `Dictionary` so a reviewer reads a key beside its string
 * and nothing else. Every key here exists in the English dictionary of the same
 * name; `src/i18n/ar/index.ts` spreads this into `AR` in the same order
 * `dictionaries.ts` spreads the English side. Same shape as `./sla.ts`, which is
 * the other `src/lib` family with an Arabic side.
 *
 * **The templates are byte-identical to English, and that is the translation.**
 * §9.6 keeps Latin proper nouns and acronyms in English inside an Arabic string
 * — `Eyvar`, `SAR`, `RDR-4821` — and `KB` / `MB` are Latin acronyms of exactly
 * that kind. Transliterating them (`كيلوبايت`) would put an Arabic word where
 * every other unit in the product renders its Latin symbol, and would make the
 * numeral and the unit disagree about direction inside one value.
 *
 * The entries exist rather than being left to the English fallback because
 * `src/lib/i18n/inventory.test.ts` requires every key reachable from `EN` to
 * resolve in `AR` — a half-translated console is §9.3's actual objection.
 */

import type { Dictionary } from '@/lib'

export const FILE_SIZE_MESSAGES_AR: Dictionary = {
  'fileSize.kb': '{size} KB',
  'fileSize.mb': '{size} MB',
}
