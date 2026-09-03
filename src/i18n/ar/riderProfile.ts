/**
 * Arabic for the rider profile sheet — the mirror of
 * `src/components/profile/rider/copy.ts`, key for key and in the same order.
 *
 * The trip row's mirrored arrow is NOT here — it is `rider.timeline.*.subtitle`
 * in `./vocabulary.ts`, shared with the full profile page, so both surfaces
 * point it the same way.
 *
 * The vocabulary follows `docs/05-restructure/design/20-arabic-glossary.md`:
 * `إفراج` for *Release* (the money is held, not launched), `إسناد` for
 * *Assign*. Terms already translated elsewhere — المحفظة, خطر التسرّب,
 * الرحلات المكتملة — are reused from `./profile.ts` and `./people.ts` and are
 * deliberately not restated here.
 */

import type { Dictionary } from '@/lib'

export const RIDER_PROFILE_AR: Dictionary = {
  'profile.rider.joined': 'انضم في {date}',

  'profile.rider.rail.unit': 'ر.س',
  'profile.rider.rail.underReview': 'مدفوعات قيد المراجعة',
  'profile.rider.rail.underReviewNote': 'تم تحصيلها ولم تُسوَّ. غير مدرجة في الرصيد.',
  'profile.rider.rail.plan': 'الاشتراك',
  'profile.rider.rail.noPlan': 'لا يوجد اشتراك على هذا السجل',
  'profile.rider.rail.planLegs': 'استُخدمت {used} من {total} رحلة',
  'profile.rider.rail.planEnded': '{plan} · انتهى في {date}',
  'profile.rider.rail.planEnds': '{plan} · ينتهي في {date}',
  'profile.rider.rail.since': 'منذ {date}',
  'profile.rider.rail.churnNone': 'لا توجد مؤشرات سلبية على السجل.',

  'profile.rider.tab.activity': 'النشاط',
  'profile.rider.tab.money': 'المال',
  'profile.rider.activity.open': 'مفتوح الآن',
  'profile.rider.activity.earlier': 'سابقًا',
  'profile.rider.activity.empty': 'لم يحدث شيء على هذا السجل بعد.',
  /* Consumed by the full-page profile only — see the English side. */
  'profile.rider.activity.captainOnBoard': 'يوجد كابتن على هذه الرحلة.',
  'profile.rider.money.empty': 'لم تتحرك أي مبالغ على هذا السجل بعد.',
  'profile.rider.money.outsideBalance': 'غير محتسبة ضمن رصيد المحفظة',

  'profile.rider.support.heading': 'في مواضع أخرى من النظام',
  'profile.rider.support.none': 'لا شيء',
  'profile.rider.support.some': '{total} في السجل · {open} مفتوح',
  'profile.rider.support.allClosed': '{total} في السجل · لا شيء مفتوح',
  'profile.rider.support.complaints': 'الشكاوى',
  'profile.rider.support.conversations': 'المحادثات',
  'profile.rider.support.lostAndFound': 'المفقودات',
  'profile.rider.support.fairnessCases': 'حالات الإنصاف',
  'profile.rider.support.requests': 'طلبات الرحلات',

  'profile.rider.action.assign': 'إسناد كابتن',
  'profile.rider.refusal.assignAssigned': 'يوجد كابتن مُسنَد بالفعل إلى هذه الرحلة.',
  'profile.rider.refusal.assign': 'يُسنَد الكابتن من لوحة التوزيع. هذه الطبقة لا تنفّذ أي إجراء.',
}
