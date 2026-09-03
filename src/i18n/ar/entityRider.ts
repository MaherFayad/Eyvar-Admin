/**
 * Arabic for the rider FULL-PAGE profile — the mirror of
 * `src/screens/entity/copy.ts`, key for key and in the same order.
 *
 * It is short for the reason the English side is: every string that names a fact
 * about a rider is already translated in `./riderProfile.ts`, `./profile.ts`,
 * `./people.ts` and `./vocabulary.ts`, and both surfaces read those. Nothing
 * here restates one.
 *
 * **The three plural families declare all six CLDR categories.** Arabic is
 * `zero · one · two · few (3–10) · many (11–99) · other (100+)` against
 * English's two, and `lib/i18n/inventory.test.ts` fails a family Arabic cannot
 * resolve at some count — not pedantry here: a rider with two quick rides needs
 * the dual and one with four needs the paucal. The numeral is dropped from
 * `#zero`, `#one` and `#two` because Arabic names those counts inside the noun;
 * `interpolate` permits a translation to drop a placeholder the English declares
 * and throws only on the reverse.
 *
 * Vocabulary follows `docs/05-restructure/design/20-arabic-glossary.md` and the
 * terms already in the product: `الرحلات الفورية` (quick rides, `./people.ts`),
 * `المحفظة` (wallet, `./profile.ts`), `حركة` (one money movement, matching
 * `./financials.ts`'s ledger register).
 */

import type { Dictionary } from '@/lib'

export const ENTITY_RIDER_AR: Dictionary = {
  'entity.rider.backTo': 'العودة إلى {name}',

  'entity.rider.strip.money': 'المال',
  'entity.rider.strip.engagement': 'النشاط',

  'entity.rider.money.inWallet': 'ر.س في المحفظة',
  'entity.rider.money.belowZero': 'الرصيد أقل من صفر',

  'entity.rider.trips.quickRides#zero': 'لا توجد رحلات فورية',
  'entity.rider.trips.quickRides#one': 'رحلة فورية واحدة',
  'entity.rider.trips.quickRides#two': 'رحلتان فوريتان',
  'entity.rider.trips.quickRides#few': '{count} رحلات فورية',
  'entity.rider.trips.quickRides#many': '{count} رحلة فورية',
  'entity.rider.trips.quickRides#other': '{count} رحلة فورية',
  'entity.rider.trips.lastTrip': 'آخر رحلة في {date}',
  'entity.rider.trips.noLastTrip': 'لم تُسجَّل أي رحلة',

  'entity.rider.plan.noAllowance': 'لا توجد رحلات مشمولة في هذا الاشتراك',

  'entity.rider.trip.meta': '{id} · {date} · {status}',
  'entity.rider.trip.route': 'من {origin} إلى {destination}',
  'entity.rider.trip.moreOpen#zero': 'لا توجد رحلات مفتوحة أخرى',
  'entity.rider.trip.moreOpen#one': 'رحلة مفتوحة أخرى',
  'entity.rider.trip.moreOpen#two': 'رحلتان مفتوحتان أخريان',
  'entity.rider.trip.moreOpen#few': '{count} رحلات مفتوحة أخرى',
  'entity.rider.trip.moreOpen#many': '{count} رحلة مفتوحة أخرى',
  'entity.rider.trip.moreOpen#other': '{count} رحلة مفتوحة أخرى',
  'entity.rider.trip.none': 'لا توجد رحلة مفتوحة الآن.',
  'entity.rider.refusal.assignPermission': 'فتح لوحة التوزيع يتطلب صلاحية العمليات.',

  'entity.rider.history.title': 'السجل',

  'entity.rider.movements.title': 'المحفظة والمدفوعات',
  'entity.rider.movements.count#zero': 'لا توجد حركات',
  'entity.rider.movements.count#one': 'حركة واحدة',
  'entity.rider.movements.count#two': 'حركتان',
  'entity.rider.movements.count#few': '{count} حركات',
  'entity.rider.movements.count#many': '{count} حركة',
  'entity.rider.movements.count#other': '{count} حركة',
  'entity.rider.movements.search': 'ابحث في الحركات',
  'entity.rider.movements.noMatch': 'لا توجد حركات مطابقة لهذا البحث.',
  'entity.rider.movements.empty.heading': 'لم تتحرك أي مبالغ بعد',
  'entity.rider.movements.empty.body':
    'لا توجد حركات في هذه المحفظة. تظهر عمليات الشحن والاسترداد هنا فور حدوثها.',
  'entity.rider.movements.empty.action': 'عرض المحافظ',

  'entity.rider.payments.count#zero': 'لا توجد مدفوعات',
  'entity.rider.payments.count#one': 'دفعة واحدة',
  'entity.rider.payments.count#two': 'دفعتان',
  'entity.rider.payments.count#few': '{count} دفعات',
  'entity.rider.payments.count#many': '{count} دفعة',
  'entity.rider.payments.count#other': '{count} دفعة',
  'entity.rider.payments.underReview': '{amount} قيد المراجعة',
}
