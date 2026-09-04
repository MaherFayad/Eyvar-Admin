/**
 * Arabic - Operations > Requests.
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

export const REQUESTS_AR: Dictionary = {
  'requests.meta.one': 'طلب واحد',
  'requests.meta.other': '{count} من الطلبات',
  'requests.search': 'ابحث بالراكب أو نقطة الالتقاء أو الوجهة أو المعرّف',
  'requests.col.ride': 'الرحلة',
  'requests.col.type': 'النوع',
  'requests.col.pickup': 'نقطة الالتقاء',
  'requests.col.destination': 'نقطة الوصول',
  'requests.col.requested': 'وقت الطلب',
  'requests.col.riderDetail': 'بيانات الراكب',
  'requests.col.plan': 'الباقة',
  'requests.col.class': 'الفئة',
  'requests.col.note': 'ملاحظة الراكب',
  'requests.channel.instant': 'فوري',
  'requests.channel.subscription': 'اشتراك',
  'requests.status.searching': 'جارٍ البحث',
  'requests.status.offered': 'معروض',
  'requests.status.assigned': 'مُسنَد',
  'requests.status.noDrivers': 'بلا كابتن',
  'requests.status.expired': 'منتهٍ',
  'requests.status.cancelled': 'ملغى',
  'requests.offered.withCaptain': 'معروض على {name} — بانتظار ردّه',
  'requests.offered.unnamed': 'معروض على أحد الكباتن — بانتظار ردّه',
  'requests.tag.vip': 'VIP',
  'requests.tag.subscriber': 'مشترك حالي',
  'requests.rider.newRating': 'لا تقييم بعد',
  'requests.rider.rating': 'التقييم {rating}',
  'requests.plan.weekly': 'أسبوعية',
  'requests.plan.biweekly': 'كل أسبوعين',
  'requests.plan.monthly': 'شهرية',
  'requests.class.economy': 'اقتصادية',
  'requests.class.comfort': 'مريحة',
  'requests.route': '{pickup} ← {destination}',
  'requests.action.assign': 'إسناد',
  'requests.action.assign.help': 'إسناد كابتن إلى هذا الطلب',
  'requests.action.expire': 'إغلاق',
  'requests.action.expire.help': 'إغلاق هذا الطلب دون العثور على كابتن',
  'requests.a11y.open': 'فتح الرحلة من {pickup} إلى {destination}',
  'requests.assign.title': 'إسناد كابتن إلى {id}؟',
  'requests.assign.body.instant': 'يُبلَّغ الراكب بأن كابتن في طريقه إليه. لا يُخصم شيء حتى تكتمل الرحلة.',
  'requests.assign.body.subscription': 'يُحصَّل حجز التفويض من الراكب ويبدأ الاشتراك. لا يمكن التراجع عن ذلك من هنا.',
  'requests.assign.confirm': 'إسناد الكابتن',
  'requests.assign.choice': 'الكابتن',
  'requests.assign.choice.help': 'الكباتن النشطون فقط. يُبلَّغ الراكب باسم القادم إليه.',
  'requests.assign.choice.message': 'اختر كابتن.',
  'requests.assign.choice.placeholder': 'اختر كابتن',
  'requests.assign.choice.empty': 'لا يوجد كابتن نشط متاح للإسناد الآن.',
  'requests.expire.title': 'إغلاق {id} دون كابتن؟',
  'requests.expire.body': 'يُبلَّغ الراكب بعدم توفّر أحد. يُفرَج عن أي حجز تفويض ولا يُخصم شيء.',
  'requests.expire.confirm': 'إغلاق الطلب',
  'requests.decided.assigned': 'مُسنَد',
  'requests.decided.expired': 'منتهٍ',
  'requests.decided.cancelled': 'ملغى',
  'requests.a11y.openCaptain': 'فتح الملف الشامل لـ{name}',
  'requests.entity.unresolved': 'لا يوجد سجل محفوظ لهذا المرجع.',
  'requests.offered.waiting': '— بانتظار ردّه',
  'requests.bulk.claim': 'استلام',
  'requests.action.claim.blocked.one': 'هذا الطلب مُستلَم بالفعل، أو تم البتّ فيه.',
  'requests.action.claim.blocked.other': '{count} من الطلبات المحدَّدة مُستلَمة بالفعل، أو تم البتّ فيها.',
  'requests.action.claim.blocked.all': 'كل الطلبات المحدَّدة ({count}) مُستلَمة بالفعل، أو تم البتّ فيها.',
  'requests.toast.claimed.other': 'تم استلام {count} من الطلبات',
  'requests.action.noPermission': 'لا يمكنك استلام طلب. اطلب من المالك صلاحية “التوزيع المباشر”.',
  'requests.toast.assigned': 'تم إسناد الكابتن',
  'requests.toast.expired': 'تم إغلاق الطلب',
  'requests.empty.cleared.heading': 'لا شيء بالانتظار',
  'requests.empty.cleared.needsDecision': 'لكل طلب كابتن أو إجابة.',
  'requests.empty.cleared.all': 'لم يرد أي طلب رحلة.',
  'requests.empty.cleared.instant': 'لا يوجد طلب رحلة فورية بالانتظار.',
  'requests.empty.cleared.subscription': 'لا يوجد طلب اشتراك بالانتظار.',
  'requests.empty.cleared.assigned': 'لم يُسنَد أي طلب اليوم بعد.',
  'requests.empty.cleared.expired': 'لم يُغلق أي طلب دون كابتن.',
  'requests.empty.firstRun.heading': 'تصل طلبات الرحلات هنا',
  'requests.empty.firstRun.body': 'تظهر في قائمة العمل هذه كل رحلة فورية وكل اشتراك جديد بانتظار كابتن.',
  'requests.empty.firstRun.action': 'عرض كل الطلبات',
  'requests.empty.noMatch': 'لا يوجد طلب يطابق هذا البحث.',
  'requests.banner.one': 'طلب واحد تجاوز موعده النهائي.',
  'requests.banner.other': '{count} من الطلبات تجاوزت موعدها النهائي.',
  'requests.error.list': 'تعذّر تحميل الطلبات. لم تتغيّر عوامل التصفية.',
  'requests.error.row.claim': 'تعذّر الاستلام.',
  'requests.error.row.release': 'تعذّر الترك.',
  'requests.error.row.assign': 'تعذّر الإسناد.',
  'requests.error.row.expire': 'تعذّر الإغلاق.',
}
