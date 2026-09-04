/**
 * Arabic for the ride-request sheet — the mirror of
 * `src/components/profile/request/copy.ts`, key for key and in the same order.
 *
 * The route's mirrored arrow is NOT here. It is `requests.route` in
 * `./requests.ts`, whose Arabic entry already reads `{pickup} ← {destination}`
 * — §9.5: a glyph that mirrors is swapped at string-construction time, never
 * with CSS — and both the queue row and this sheet render it from there, so the
 * ride cannot point two ways.
 *
 * The vocabulary follows `docs/05-restructure/design/20-arabic-glossary.md`.
 * Terms already translated elsewhere are reused and deliberately not restated:
 * the six statuses and the two channel names from `./requests.ts`, the three
 * plan names from `./subscriptions.ts`, the countdown from `./sla.ts`.
 *
 * Two word choices worth recording, because both were a decision:
 *
 *   **`مبلغ محجوز`** for *Authorisation hold* — the money is *held*, not
 *   *charged*. `مسحوب` would say it has already been taken, which is the exact
 *   misreading the English label exists to prevent: it is captured only when a
 *   captain is assigned.
 *
 *   **`مسافة بخط مستقيم`** for *straight line* — the phrase names the
 *   measurement rather than the journey, because the figure is the crow-flies
 *   gap between two hand-placed anchors and not a distance anybody drove.
 *   `المسافة` alone would be read as the trip's own distance and priced
 *   against.
 */

import type { Dictionary } from '@/lib'

export const REQUEST_PROFILE_AR: Dictionary = {
  'profile.request.band.vip': 'راكب مميّز',

  'profile.request.map.heading': 'المسار',
  'profile.request.map.a11y': 'خريطة للرياض، نقطة الالتقاط في {pickup} ونقطة الوصول في {destination}.',
  'profile.request.map.pickup': 'الالتقاط',
  'profile.request.map.destination': 'الوصول',
  'profile.request.map.straightLine': '{distance} كم مسافة بخط مستقيم',
  'profile.request.map.unplaced': 'تعذّر تحديد موقع {place} على الخريطة.',
  'profile.request.map.none': 'لا تعرف الخريطة أيًّا من طرفَي هذه الرحلة.',
  'profile.request.map.zoom.in': 'تكبير',
  'profile.request.map.zoom.out': 'تصغير',

  'profile.request.float.waiting': 'مدة الانتظار',
  'profile.request.float.waited': 'انتظر',

  'profile.request.rail.unit': 'ر.س',
  'profile.request.rail.since': 'طلبها في {time}',
  'profile.request.rail.fare': 'الأجرة التقديرية',
  'profile.request.rail.fareNote': 'قُدِّرت عند طلب الراكب، وقد تختلف فاتورة الرحلة عنها.',
  'profile.request.rail.hold': 'مبلغ محجوز',
  'profile.request.rail.holdNote': 'يُسحب عند إسناد كابتن.',
  'profile.request.rail.noQuote': 'لم يصدر تقدير لهذه الرحلة.',
  'profile.request.rail.captain': 'الكابتن',
  'profile.request.rail.assignedOn': 'أُسندت في {date}',
  'profile.request.rail.offerCloses': 'تنتهي مهلة الرد في {time}',
  'profile.request.rail.noCaptain': 'لم يستلم أحد هذه الرحلة بعد',
  'profile.request.rail.owner': 'المسؤول',
  'profile.request.rail.ownerNone': 'غير مستلَمة',
  'profile.request.rail.ownerSince': 'مستلَمة منذ {time}',

  'profile.request.tab.details': 'التفاصيل',
  'profile.request.tab.timeline': 'التسلسل الزمني',
  'profile.request.group.ride': 'الرحلة',
  'profile.request.group.money': 'المبالغ',
  'profile.request.group.rider': 'الراكب',
  'profile.request.group.captain': 'الكابتن',
  'profile.request.group.notes': 'ملاحظة الراكب',
  'profile.request.notes.empty': 'لم يترك الراكب ملاحظة.',

  'profile.request.field.channel': 'النوع',
  'profile.request.field.pickup': 'الالتقاط',
  'profile.request.field.destination': 'الوصول',
  'profile.request.field.vehicleClass': 'فئة المركبة',
  'profile.request.field.requestedAt': 'وقت الطلب',
  'profile.request.field.fare': 'الأجرة التقديرية',
  'profile.request.field.hold': 'مبلغ محجوز',
  'profile.request.field.plan': 'الباقة',
  'profile.request.field.preferredTime': 'وقت الالتقاط المفضّل',
  'profile.request.field.captain': 'الكابتن',
  'profile.request.field.notes': 'ملاحظة الراكب',
  'profile.request.field.slaDue': 'الموعد النهائي',
  'profile.request.field.riderRating': 'تقييم الراكب',
  'profile.request.field.priorSubscription': 'اشترك سابقًا',
  'profile.request.field.offerExpires': 'انتهاء مهلة العرض',
  'profile.request.field.assignedBy': 'أسندها',
  'profile.request.field.subscription': 'الاشتراك المُنشأ',

  'profile.request.event.requested': 'طلب الراكب هذه الرحلة',
  'profile.request.event.claimed': 'استلمها {name}',
  'profile.request.event.offerCloses': 'تنتهي مهلة رد {name}',
  'profile.request.event.breached': 'انقضى الموعد النهائي دون إسناد كابتن',
  'profile.request.event.assigned': 'أُسندت إلى {name}',
  'profile.request.event.assignedBy': 'أسند {actor} الرحلة إلى {name}',
  'profile.request.event.expired': 'أُغلقت دون كابتن',
  'profile.request.event.cancelled': 'ألغى الراكب الرحلة',
}
