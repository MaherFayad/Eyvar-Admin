/**
 * Arabic for the ride record — the mirror of
 * `src/components/profile/trip/copy.ts`, key for key and in the same order.
 *
 * One dictionary for both the sheet and the page, because they are two
 * arrangements of one record. See the English file's header.
 *
 * The vocabulary follows `docs/05-restructure/design/20-arabic-glossary.md`.
 * Terms already translated elsewhere are reused and deliberately not restated:
 * the eight trip statuses and the two kind nouns from `./trips.ts`, the plan
 * names from `./subscriptions.ts`, the record-kind nouns from `./profile.ts`.
 *
 * ## The arrow mirrors, and it mirrors HERE
 *
 * `profile.trip.band.route` carries `←` in this file and `→` in the English
 * one. §9.5: a glyph that mirrors is swapped at string-construction time, never
 * with CSS — a `transform: scaleX(-1)` on an arrow inside a sentence flips the
 * text around it too, and a `rtl:` variant on the container flips the place
 * names' own order.
 *
 * ## Three word choices worth recording, because each was a decision
 *
 * **`مقابل الخطة`** for *Against plan* — the phrase names what the figure is
 * measured against. `التأخير` (*the delay*) would be wrong on the trips that
 * are ahead of the quote, and this row is signed in both directions.
 *
 * **`الوقت الضائع`** for *lost* — time that went somewhere nobody chose, which
 * is what a late arrival and a detour have in common. `التأخير` again names
 * only one of the two.
 *
 * **`حصة إيفار`** for *Eyvar cut* — the platform's share of the fare. The
 * English label is deliberately the company's name rather than *commission*
 * (`عمولة`), because **Q7 is open**: four pricing models disagree about what
 * the commission rate is, and naming the line after the party that takes it
 * says what is true without settling what is not.
 */

import type { Dictionary } from '@/lib'

export const TRIP_PROFILE_AR: Dictionary = {
  /* ── the band ───────────────────────────────────────────────────────── */
  'profile.trip.kind': 'رحلة',
  /* §9.5 — the arrow is swapped in the string, never with CSS. */
  'profile.trip.band.route': '{pickup} ← {destination}',
  'profile.trip.band.meta': '{id} · {date} · {rider} · {captain}',
  'profile.trip.band.metaNoCaptain': '{id} · {date} · {rider}',
  'profile.trip.band.flagged': 'معلَّمة',

  /* ── the map ────────────────────────────────────────────────────────── */
  'profile.trip.map.heading': 'المسار',
  'profile.trip.map.a11y':
    'خريطة للرياض، نقطة الالتقاط في {pickup} ونقطة الوصول في {destination}.',
  'profile.trip.map.a11yLive':
    'خريطة للرياض، نقطة الالتقاط في {pickup} ونقطة الوصول في {destination}، والموقع التقديري للكابتن بينهما.',
  'profile.trip.map.pickup': 'الالتقاط',
  'profile.trip.map.destination': 'الوصول',
  'profile.trip.map.captain': 'الكابتن الآن',
  'profile.trip.map.straightLine': '{distance} كم مسافة بخط مستقيم',
  'profile.trip.map.unplaced': 'تعذّر تحديد موقع {place} على الخريطة.',
  'profile.trip.map.none': 'لا تعرف الخريطة أيًّا من طرفَي هذه الرحلة.',
  'profile.trip.map.estimated': 'موقع الكابتن تقديري محسوب من الوقت المنقضي، وليس متتبَّعًا.',
  'profile.trip.map.zoom.in': 'تكبير',
  'profile.trip.map.zoom.out': 'تصغير',

  /* ── the figures ────────────────────────────────────────────────────── */
  'profile.trip.fact.distance': 'المسافة',
  'profile.trip.fact.elapsed': 'الوقت المنقضي',
  'profile.trip.fact.remaining': 'الوقت المتبقي',
  'profile.trip.fact.plan': 'مقابل الخطة',
  'profile.trip.fact.duration': 'المدة',
  'profile.trip.fact.km': '{km} كم',
  'profile.trip.fact.minutes': '{minutes} دقيقة',
  'profile.trip.fact.speed': '{speed} كم/س',
  'profile.trip.fact.over': '+{minutes} دقيقة',
  'profile.trip.fact.under': '−{minutes} دقيقة',
  'profile.trip.fact.onPlan': 'مطابقة للخطة',
  'profile.trip.fact.eta': 'الوصول المتوقع {time}',
  'profile.trip.fact.noPlan': 'لا توجد مدة مقدَّرة للمقارنة بها.',

  /* ── the two parties ────────────────────────────────────────────────── */
  'profile.trip.party.passenger': 'الراكب',
  'profile.trip.party.captain': 'الكابتن',
  'profile.trip.party.callRider': 'اتصال بالراكب',
  'profile.trip.party.callCaptain': 'اتصال بالكابتن',
  'profile.trip.party.noCaptain': 'لم يُسنَد كابتن',
  'profile.trip.party.noCaptainReason':
    'أُلغيت هذه الرحلة قبل أن يقبلها كابتن، فلا يوجد من يُتصل به.',
  'profile.trip.party.mobile': 'الجوال',
  'profile.trip.party.subscription': 'الاشتراك',
  'profile.trip.party.rating': 'التقييم المعطى',
  'profile.trip.party.notRated': 'لم تُقيَّم',
  'profile.trip.party.ratingWithNote': '{rating} — «{note}»',
  'profile.trip.party.vehicle': 'المركبة',
  'profile.trip.party.standing': 'السجل',
  'profile.trip.party.standingValue': '{rating} تقييم · {trips} رحلة · {onTime} في الموعد',
  'profile.trip.party.vehicleValue': '{vehicle} · {tier}',
  'profile.trip.party.openRider': 'فتح ملف {name}',
  'profile.trip.party.openCaptain': 'فتح ملف {name}',

  /* ── the subscription block ─────────────────────────────────────────── */
  'profile.trip.sub.leg': '{id} · {plan} · الرحلة {index} من {total}',
  'profile.trip.sub.open': 'فتح الاشتراك {id}',
  'profile.trip.sub.unresolved': 'لم يعد هذا الاشتراك محفوظًا، فلا يمكن فتحه.',

  /* ── the stage rail ─────────────────────────────────────────────────── */
  'profile.trip.tab.stages': 'المراحل',
  'profile.trip.tab.fare': 'الأجرة',
  'profile.trip.stages.heading': 'ما الذي حدث',
  'profile.trip.stage.requested': 'طُلبت',
  'profile.trip.stage.accepted': 'قبِلها الكابتن',
  'profile.trip.stage.arrived': 'الوصول لنقطة الالتقاط',
  'profile.trip.stage.started': 'بدأت الرحلة',
  'profile.trip.stage.detour': 'تحويلة',
  'profile.trip.stage.detourOn': 'تحويلة على {place}',
  'profile.trip.stage.dropoff': 'التوصيل',
  'profile.trip.stage.cancelled': 'أُلغيت',
  'profile.trip.stage.pending': 'لم تحدث بعد',
  'profile.trip.stage.lost': 'تأخّر {minutes} دقيقة',
  'profile.trip.stage.added': '+{minutes} دقيقة',
  'profile.trip.stage.wait': '{minutes} دقيقة',
  'profile.trip.stages.lost': '{minutes} دقيقة ضائعة',
  'profile.trip.stages.onTime': 'لا وقت ضائع',
  'profile.trip.stages.error': 'تعذّرت قراءة سجل المراحل.',
  'profile.trip.stages.empty': 'لم تُسجَّل أي مرحلة لهذه الرحلة.',

  /* ── the fare ───────────────────────────────────────────────────────── */
  'profile.trip.fare.heading': 'الأجرة',
  'profile.trip.fare.total': 'إجمالي الأجرة',
  'profile.trip.fare.captain': 'أرباح الكابتن',
  'profile.trip.fare.platform': 'حصة إيفار',
  'profile.trip.fare.extraStop': 'وقفة إضافية',
  'profile.trip.fare.tip': 'إكرامية',
  'profile.trip.fare.payment': 'الدفعة',
  'profile.trip.fare.noPayment': 'لم تُحصَّل أي دفعة لهذه الرحلة.',
  'profile.trip.fare.reconcile':
    'مجموع هذه البنود لا يساوي الإجمالي — {amount} ريال غير مُفسَّرة.',

  /* ── the footer and the record's own state ──────────────────────────── */
  'profile.trip.footer.open': 'فتح السجل الكامل',
  'profile.trip.state.error': 'تعذّرت قراءة هذه الرحلة.',
  'profile.trip.state.retry': 'إعادة المحاولة',
  'profile.trip.desynced':
    'لم يؤكّد تطبيق الراكب آخر تغيّر في الحالة، فقد يختلف ما يراه الراكب عن هذا السجل.',
}
