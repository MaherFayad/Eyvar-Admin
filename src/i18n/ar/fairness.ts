/**
 * Arabic - Support > Captain Fairness.
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

export const FAIRNESS_AR: Dictionary = {
  'fairness.meta.one': 'حالة واحدة',
  'fairness.meta.other': '{count} من الحالات',
  'fairness.search': 'ابحث بالكابتن أو الراكب أو الرحلة أو المعرّف',
  'fairness.col.captain': 'الكابتن',
  'fairness.col.rating': 'التقييم المعترَض عليه',
  'fairness.col.suspension': 'سبب الإيقاف',
  'fairness.col.rider': 'الراكب',
  'fairness.col.kind': 'الحالة',
  'fairness.a11y.open': 'فتح سجل {name}',
  'fairness.line': '{reason} · {id}',
  'fairness.kind.suspensionAppeal': 'تظلّم من إيقاف',
  'fairness.kind.ratingDispute': 'نزاع تقييم',
  'fairness.kind.riderReport': 'بلاغ راكب',
  'fairness.reason.DRV_SUSPENSION_APPEAL': 'تظلّم من إيقاف',
  'fairness.reason.DRV_RATING_DISPUTE': 'اعتراض على تقييم',
  'fairness.reason.DRV_RIDER_NOSHOW': 'عدم حضور الراكب',
  'fairness.reason.DRV_RIDER_CONDUCT': 'سلوك الراكب',
  'fairness.reason.DRV_VEHICLE_DAMAGE': 'إتلاف المركبة',
  'fairness.reason.DRV_DEDUCTION_DISPUTE': 'اعتراض على خصم',
  'fairness.status.open': 'مفتوحة',
  'fairness.status.upheld': 'مؤيَّدة',
  'fairness.status.overturned': 'منقوضة',
  'fairness.status.withdrawn': 'مسحوبة',
  'fairness.rating.value': '{rating} من 5',
  'fairness.rating.none': 'لا تقييم في هذه الحالة',
  'fairness.rating.recomputed': '{rating} من 5 · أُعيد احتساب المتوسط',
  'fairness.rating.voidedOnly': '{rating} من 5 · أُلغيت النتيجة، والمتوسط دون تغيير',
  'fairness.suspension.none': 'لا سبب مسجَّل',
  'fairness.decided.on': 'بُتّ فيها في {date}',
  'fairness.action.uphold': 'تأييد',
  'fairness.action.uphold.help': 'يبقى القرار الأصلي قائمًا',
  'fairness.action.overturn': 'نقض',
  'fairness.action.overturn.help': 'نقض القرار الأصلي',
  'fairness.uphold.title': 'تأييد القرار الصادر ضد {name}؟',
  'fairness.uphold.body': 'يبقى القرار الأصلي قائمًا ويُسجَّل سببك في سجل الكابتن. لا يمكن تغييره من هنا.',
  'fairness.uphold.confirm': 'تأييد',
  'fairness.overturn.title': 'نقض القرار الصادر ضد {name}؟',
  'fairness.overturn.body': 'يُنقض القرار الأصلي ويُسجَّل سببك في سجل الكابتن. لا يمكن تغييره من هنا.',
  'fairness.overturn.confirm': 'نقض',
  'fairness.rationale': 'السبب',
  'fairness.rationale.help': 'يقرأ الكابتن هذا النص. اذكر ما حسم القرار.',
  'fairness.rationale.message': 'أدخل سببًا يمكن للكابتن قراءته.',
  'fairness.detail.back': 'العودة إلى الحالات',
  'fairness.detail.notFound': 'هذه الحالة غير مسجّلة',
  'fairness.detail.notFoundBody': 'لا شيء هنا يطابق {id}. ربما الرابط قديم.',
  'fairness.detail.contested': 'ما يعترض عليه الكابتن',
  'fairness.detail.decision': 'القرار',
  'fairness.detail.noRationale': 'لم يُسجَّل سبب.',
  'fairness.detail.reinstated': 'أُعيد',
  'fairness.detail.trip': 'الرحلة',
  'fairness.detail.decidedInTime': 'بُتّ فيها ضمن مهلتها.',
  'fairness.detail.parties': 'الأطراف',
  'fairness.detail.captain': 'الكابتن {name}',
  'fairness.detail.rider': 'الراكب {name}',
  'fairness.decided.blocked': 'تم البتّ في هذه الحالة. لا يُعكس القرار من هنا.',
  'fairness.toast.upheld': 'تم تأييد الحالة',
  'fairness.toast.overturned': 'تم نقض الحالة',
  'fairness.economics.title': 'ما الذي يقيسه هذا الرقم وما لا يقيسه',
  'fairness.economics.upperBound': 'الساعة المشغولة هي الوقت أثناء الرحلة. يحتاج وقت الانتظار إلى قياسات من تطبيق الكابتن لا تصل إلى هذه اللوحة، لذا فكل رقم هنا حدّ أعلى.',
  'fairness.economics.tips': 'تشمل الأرباح الإكراميات.',
  'fairness.economics.fleetAverage': 'متوسط الأسطول هو متوسط معدلات كل كابتن، لا إجمالي الأرباح مقسومًا على إجمالي الساعات.',
  'fairness.economics.noAction': 'لا شيء في هذا العرض قائمة عمل: لا حالة، ولا موعد نهائي، ولا قرار.',
  'fairness.empty.cleared.heading': 'لا شيء ينتظر ردًّا',
  'fairness.empty.cleared.appeals': 'لا يوجد كابتن ينتظر البتّ في تظلّم من إيقاف.',
  'fairness.empty.cleared.disputes': 'لا يوجد تقييم قيد الاعتراض.',
  'fairness.empty.cleared.reports': 'لا يوجد بلاغ راكب ينتظر قرارًا.',
  'fairness.empty.firstRun.heading': 'طريق العودة للكابتن',
  'fairness.empty.firstRun.body': 'إيقاف يُتظلَّم منه، وتقييم يُعترض عليه، وبلاغ من راكب. ارتفاع نسبة النقض هنا ليس إخفاقًا — بل يعني أن طريق التظلّم يلتقط القرارات الخاطئة قبل أن تكلّفك كابتن.',
  'fairness.empty.firstRun.action': 'عرض اقتصاديات الكابتن',
  'fairness.empty.noMatch': 'لا توجد حالة تطابق هذا البحث.',
  'fairness.banner.one': 'حالة واحدة تجاوزت موعدها النهائي.',
  'fairness.banner.other': '{count} من الحالات تجاوزت موعدها النهائي.',
  'fairness.error.list': 'تعذّر تحميل حالات الإنصاف. لم تتغيّر عوامل التصفية.',
  'fairness.error.board': 'تعذّر تحميل اقتصاديات الكابتن.',
  'fairness.error.row.claim': 'تعذّر الاستلام.',
  'fairness.error.row.release': 'تعذّر الترك.',
  'fairness.error.row.decide': 'تعذّر حفظ القرار.',
}
