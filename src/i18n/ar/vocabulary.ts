/**
 * Arabic - the reason-code labels (src/i18n/vocabulary/copy.ts).
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

export const VOCABULARY_AR: Dictionary = {
  'reason.CAP_CANCEL_ADV': 'ألغى الكابتن مسبقًا',
  'reason.CAP_LATE': 'تأخّر الكابتن عن نقطة الالتقاء',
  'reason.CAP_NOSHOW': 'عدم حضور الكابتن',
  'reason.CAP_OFFPLATFORM_PAY': 'طلب الكابتن دفعًا نقديًا خارج المنصة',
  'reason.CAP_CONDUCT': 'سلوك غير لائق من الكابتن',
  'reason.BKG_CANCEL_REQ': 'ألغى الراكب الحجز',
  'reason.BKG_WRONG_SLOT': 'حجز الراكب تاريخًا أو وقتًا خاطئًا',
  'reason.BKG_NO_SUPPLY': 'لا يوجد كابتن متاح في المنطقة',
  'reason.PAY_INCORRECT_CHARGE': 'خُصم من الراكب مبلغ خاطئ',
  'reason.PAY_DECLINED': 'فشل الدفع أو رُفض',
  'reason.PAY_REFUND_REQ': 'طلب الراكب استردادًا',
  'reason.PAY_GOODWILL': 'رصيد حُسن نية، دون خطأ ثابت',
  'reason.TRP_ROUTE_DEVIATION': 'سلك الكابتن مسارًا خاطئًا',
  'reason.TRP_LOST_ITEM': 'ترك الراكب متعلقات في المركبة',
  'reason.TRP_GHOST_COMPLETE': 'اكتملت الرحلة دون أن يركب الراكب',
  'reason.TRP_FALSE_COMPLETE': 'أنهى الكابتن رحلة لم تُنفَّذ',
  'reason.TECH_STATE_DESYNC': 'عدم تطابق حالة الرحلة — التطبيقان غير متفقين',
  'reason.APP_LOGIN': 'الراكب لا يستطيع تسجيل الدخول',
  'reason.APP_CRASH': 'التطبيق يتعطّل أو لا يفتح',
  'reason.APP_PROMO': 'لم يُطبَّق رمز العرض',
  'reason.SAF_RIDER_UNSAFE': 'شعر الراكب بعدم الأمان أثناء الرحلة',
  'reason.SAF_ACCIDENT': 'حادث أو عطل في المركبة',
  'reason.SAF_THEFT': 'فقدان غرض أو سرقته أثناء الرحلة',
  'reason.SUB_SAME_CAPTAIN_BROKEN': 'تغيّر الكابتن المُسنَد أثناء الباقة',
  'reason.SUB_FREEZE_TRAVEL': 'الراكب مسافر — جُمِّدت الباقة',
  'reason.SUB_FREEZE_MEDICAL': 'سبب طبي — جُمِّدت الباقة',
  'reason.DRV_RATING_DISPUTE': 'يعترض الكابتن على تقييم غير منصف',
  'reason.DRV_DEDUCTION_DISPUTE': 'يعترض الكابتن على خصم',
  'reason.DRV_SUSPENSION_APPEAL': 'يتظلّم الكابتن من إيقاف',
  'reason.DRV_DOC_EXPIRED': 'انتهت صلاحية مستند مطلوب',
  'reason.CASH_SHORTFALL': 'النقد المحصَّل لا يطابق الرحلة',
  'reason.OTHER_UNCODED': 'أخرى — تحتاج إلى مراجعة التصنيف',
  'reason.BKG_CAPTAIN_PREF': 'طلب الراكب كابتن آخر',
  'reason.DRV_RIDER_NOSHOW': 'لم يحضر الراكب للرحلة',
  'reason.DRV_RIDER_CONDUCT': 'سلوك غير لائق من الراكب',
  'reason.DRV_VEHICLE_DAMAGE': 'أتلف الراكب المركبة',
  'reason.fare_dispute': 'يعترض الراكب على الأجرة',
  'reason.lost_item': 'ترك الراكب متعلقات في المركبة',
  'reason.captain_absence': 'لم يصل الكابتن لرحلة مجدولة',
  'reason.app_issue': 'بلاغ عن خلل في التطبيق',
  'reason.payout_blocked': 'رُفض صرف المستحقات بناءً على البيانات المسجَّلة',
  'reason.dispute_no_show': 'اعتراض — عدم الحضور',
  'reason.dispute_vehicle_class': 'اعتراض — فئة المركبة',
  'reason.dispute_fare_dispute': 'اعتراض — الأجرة',
  'reason.dispute_toll_charge': 'اعتراض — رسوم الطريق',
  'reason.dispute_cancellation_fee': 'اعتراض — رسوم الإلغاء',
  'reason.dispute_vehicle_damage': 'اعتراض — إتلاف المركبة',
}
