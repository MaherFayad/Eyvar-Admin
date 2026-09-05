/**
 * Arabic for the subscription sheet — the mirror of
 * `src/components/profile/subscription/copy.ts`, key for key and in the same
 * order.
 *
 * The route's mirrored arrow is NOT here. It is `requests.route` in
 * `./requests.ts`, which already reads `{pickup} ← {destination}` — §9.5: a
 * glyph that mirrors is swapped at string-construction time, never with CSS —
 * and the request sheet, the subscription sheet and both queues render it from
 * there, so a commute cannot point two ways.
 *
 * Terms already translated elsewhere are reused and deliberately not restated:
 * the six cycle states from `./profile.ts`, the three commands and their
 * reasons from `./subscriptions.ts`, and the map's shared vocabulary from
 * `./requestProfile.ts`.
 *
 * Two word choices worth recording:
 *
 *   **`رحلة ذهاب وعودة`** for *Round trip* — it names the whole daily shape.
 *   `عودة` alone would read as the leg home on its own, which is exactly the
 *   half that hides the fact the day costs two legs rather than one.
 *
 *   **`محتجز في الضمان`** for *Held in escrow* — the money is held against legs
 *   not yet delivered. `محجوز` would say merely *reserved*, losing the reason
 *   it is held and the condition on which it is released.
 */

import type { Dictionary } from '@/lib'

export const SUBSCRIPTION_PROFILE_AR: Dictionary = {
  'profile.subscription.map.heading': 'المسار اليومي',
  'profile.subscription.map.a11y.oneWay':
    'خريطة للرياض، نقطة الالتقاط اليومية في {pickup} ونقطة الوصول في {destination}.',
  'profile.subscription.map.a11y.roundTrip':
    'خريطة للرياض، المسار اليومي بين {pickup} و{destination}، ذهابًا وعودة.',
  'profile.subscription.map.roundTrip': 'ذهاب وعودة',
  'profile.subscription.map.oneWay': 'ذهاب فقط',

  'profile.subscription.figure.legs': 'الرحلات المستخدمة',
  'profile.subscription.figure.legsLeft': 'بقيت {count}',
  'profile.subscription.figure.paid': 'المدفوع',

  'profile.subscription.rail.captain': 'الكابتن',
  'profile.subscription.rail.noCaptain': 'لم يُسند كابتن لهذه الدورة',
  'profile.subscription.rail.cycle': 'الدورة',
  'profile.subscription.rail.window': '{from} – {to}',
  'profile.subscription.rail.frozenUntil': 'مجمّدة حتى {date}',
  'profile.subscription.rail.cancelledOn': 'أُلغيت في {date}',
  'profile.subscription.rail.escrow': 'محتجز في الضمان',
  'profile.subscription.rail.escrowNote': 'يُفرج عنه للكابتن مع تنفيذ الرحلات.',
  'profile.subscription.rail.noEscrow': 'لا يوجد مبلغ محتجز على هذه الدورة.',
  'profile.subscription.rail.renewal': 'احتمال التجديد',
  'profile.subscription.rail.noRenewal': 'لا يوجد سجل كافٍ للتنبؤ بعد.',

  'profile.subscription.group.commitment': 'الاشتراك',
  'profile.subscription.group.cancellation': 'سبب الإلغاء',
  'profile.subscription.field.tripKind': 'المسار اليومي',
  'profile.subscription.field.legs': 'الرحلات',

  'profile.subscription.event.started': 'بدأت الدورة',
  'profile.subscription.event.ends': 'تنتهي الدورة',
  'profile.subscription.event.frozen': 'مجمّدة حتى هذا التاريخ',
  'profile.subscription.event.cancelled': 'أُلغيت وسُوّيت',
}
