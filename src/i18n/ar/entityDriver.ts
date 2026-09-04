/**
 * Arabic for the captain FULL-PAGE profile — the mirror of
 * `src/screens/entity/DriverCopy.ts`, key for key and in the same order.
 *
 * It is short for the reason the English side is: every string that names a
 * fact about a captain is already translated in `./driverProfile.ts`,
 * `./profile.ts`, `./people.ts` and `./financials.ts`, and both surfaces read
 * those. Nothing here restates one.
 *
 * The plural family declares all six CLDR categories; see `./driverProfile.ts`
 * for why, and why the numeral is dropped from `#zero`, `#one` and `#two`.
 *
 * `حركة` for one ledger posting matches `./financials.ts`'s existing ledger
 * register rather than minting a second word for the same row.
 */

import type { Dictionary } from '@/lib'

export const ENTITY_DRIVER_AR: Dictionary = {
  'entity.driver.backTo': 'العودة إلى {name}',

  /* ── the trips table (owner amendment to D-CP-13) ─────────────────────
     `رحلة` is `trips.*`'s own noun, reused — the column headers, the status
     words and the `no-match` sentence on this table are all `trips.*` keys and
     are already translated. `مكتملة` is the completed count's qualifier, and it
     is what keeps the subheading (a captain fact) apart from the pagination
     (the table's rows). Digits stay Western (§9.2). */
  'entity.driver.trips.title': 'الرحلات',
  'entity.driver.trips.count#zero': 'لا توجد رحلات مكتملة',
  'entity.driver.trips.count#one': 'رحلة واحدة مكتملة',
  'entity.driver.trips.count#two': 'رحلتان مكتملتان',
  'entity.driver.trips.count#few': '{count} رحلات مكتملة',
  'entity.driver.trips.count#many': '{count} رحلة مكتملة',
  'entity.driver.trips.count#other': '{count} رحلة مكتملة',
  'entity.driver.trips.search': 'ابحث في الرحلات',
  'entity.driver.trips.empty.heading': 'لم يقم هذا الكابتن بأي رحلة',
  'entity.driver.trips.empty.body': 'تظهر هنا كل رحلة يقودها، بما كسبته وكيف انتهت.',
  /* `النشاط` is the tab's own name (`profile.driver.tab.activity`), so the
     section takes `سجل النشاط` — a section never repeats its tab's name. */
  'entity.driver.timeline.title': 'سجل النشاط',

  'entity.driver.ledger.title': 'حركات المستحقات',
  'entity.driver.ledger.count#zero': 'لا توجد حركات',
  'entity.driver.ledger.count#one': 'حركة واحدة',
  'entity.driver.ledger.count#two': 'حركتان',
  'entity.driver.ledger.count#few': '{count} حركات',
  'entity.driver.ledger.count#many': '{count} حركة',
  'entity.driver.ledger.count#other': '{count} حركة',
  'entity.driver.ledger.period': 'من {start} إلى {end}',
  'entity.driver.ledger.allTime': 'كل الحركات',
  'entity.driver.ledger.search': 'ابحث في الحركات',
  /* `entity.driver.ledger.noMatch` deleted with its English counterpart — a
     second spelling of `fin.empty.noMatch`, which already carries this sentence
     in both languages (LR-4). */
  'entity.driver.ledger.empty.heading': 'لم تصل أي أرباح إلى هذا الكابتن',
  'entity.driver.ledger.empty.body':
    'تُقيَّد أرباح الرحلة المكتملة هنا، ويخرجها التحويل. لم يحدث أي منهما.',
  /* `العودة` matches `entity.driver.backTo` above, and `التحويلات` is the term
     this dictionary already uses for payouts — neither word is new here. */
  'entity.driver.ledger.empty.action': 'العودة إلى التحويلات',
}
