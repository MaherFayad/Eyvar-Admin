/**
 * Arabic - Operations > Live Dispatch.
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

export const DISPATCH_AR: Dictionary = {
  'action.cancel': 'إلغاء',
  'column.rider': 'الراكب',
  'dispatch.activeAlerts': 'نشطة',
  'dispatch.assignCaptain': 'إسناد كابتن',
  'dispatch.autoMatchRate': 'معدل المطابقة الآلية',
  'dispatch.avgMatchTime': 'متوسط زمن المطابقة',
  'dispatch.confirmAssign': 'إسناد كابتن',
  'dispatch.dismissAlert': 'إقرار',
  'dispatch.empty.board.action': 'الانتقال إلى الطلبات',
  'dispatch.empty.board.body': 'يتتبّع التوزيع المباشر الرحلات الجارية والطلبات المنتظرة كابتن ومن هو على الوردية. ويمتلئ مع بداية اليوم.',
  'dispatch.empty.board.heading': 'لا شيء يتحرك بعد',
  'dispatch.empty.fleet.body': 'يظهر الكباتن هنا مع دخولهم الوردية.',
  'dispatch.empty.fleet.heading': 'لا يوجد كابتن متصل',
  'dispatch.empty.pending.body': 'لكل طلب رحلة كابتن. وتظهر هنا الطلبات غير المطابَقة.',
  'dispatch.empty.pending.heading': 'لا شيء بالانتظار',
  'dispatch.empty.trips.body': 'لا توجد رحلة على الطريق الآن. وتظهر الرحلات الجديدة هنا فور قبول الكباتن لها.',
  'dispatch.empty.trips.heading': 'لا شيء في الطريق',
  'dispatch.error.telemetry': 'سرعة التوزيع غير متاحة أثناء تعطّل اللوحة.',
  'dispatch.feed.activeTrips': 'الرحلات النشطة',
  'dispatch.feed.fleet': 'الأسطول المتصل',
  'dispatch.feed.pendingMatch': 'بانتظار التوزيع',
  'dispatch.fleet.active': 'نشط',
  'dispatch.fleetUtilization': 'استغلال الأسطول',
  'dispatch.inTransit': 'في الطريق',
  'dispatch.interventions.title': 'التدخّلات المباشرة',
  'dispatch.interventions.unavailable': 'التدخّلات للقراءة فقط حتى تُوصَل تغذية التنبيهات المباشرة. والإقرار أو إعادة الإسناد هنا لن يحفظ شيئًا.',
  'dispatch.liveConnected': 'القياسات المباشرة متصلة',
  'dispatch.liveTelemetry': 'سرعة التوزيع',
  'dispatch.manual.desc': 'أسنِد كابتن إلى الطلب {id} لـ{rider}، مع الالتقاء في {pickup}.',
  'dispatch.manual.assignError': 'تعذّر إسناد الكابتن. لم يتغيّر شيء.',
  'dispatch.manual.empty': 'لا يوجد كابتن على الوردية. يعود الإسناد عندما يتصل أحدهم.',
  'dispatch.manual.error': 'لم تُحمَّل قائمة الكباتن. أعد المحاولة، أو أغلق هذه النافذة ووزّع من قائمة العمل.',
  'dispatch.manual.loading': 'جارٍ تحميل الكباتن',
  'dispatch.manual.title': 'إسناد كابتن',
  'dispatch.noInterventions': 'كل رحلة مباشرة ضمن SLA الخاص بها.',
  'dispatch.reassignCaptain': 'إعادة الإسناد',
  'dispatch.toast.dispatched': 'أُسنِد الطلب {id} إلى الكابتن {name}',
  'dispatch.unassigned': 'غير مُسنَد',
  'sub.selectDriverPlaceholder': 'اختر كابتن نشطًا',
  'trip.pickup': 'نقطة الالتقاء',
  'dispatch.action.assigning': 'جارٍ الإسناد…',
  'dispatch.selectCaptain': 'اختر كابتن متاحًا',
}
