/**
 * Arabic - Admin > Activity Log.
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

export const ADMIN_ACTIVITY_AR: Dictionary = {
  'admin.activity.meta': 'سجل للإضافة فقط. كل إجراء يُغيِّر البيانات، ومعه المشغّل الذي نفّذه.',
  'admin.activity.search': 'ابحث بالمشغّل أو الإجراء أو الهدف',
  'admin.activity.column.event': 'الحدث',
  'admin.activity.column.operator': 'المشغّل',
  'admin.activity.column.action': 'الإجراء',
  'admin.activity.column.detail': 'ما الذي حدث',
  'admin.activity.column.note': 'ملاحظة',
  'admin.activity.column.target': 'الهدف',
  'admin.activity.column.amount': 'المبلغ',
  'admin.activity.column.reason': 'رمز السبب',
  'admin.activity.column.time': 'التوقيت',
  'admin.activity.empty.heading': 'سجل من فعل ماذا، ومتى',
  'admin.activity.empty.body': 'السجل للإضافة فقط ويبدأ فارغًا. أول صرف مستحقات أو إيقاف أو تغيير في الإعدادات يكتب أول سطر فيه.',
  'admin.activity.noMatch': 'لا توجد قيود تطابق هذا البحث.',
  'admin.activity.error': 'تعذّر تحميل سجل النشاط.',
  'admin.activity.bulk.export': 'تصدير المحدَّد',
  'admin.activity.bulk.copyIds': 'نسخ معرّفات الأحداث',
  'admin.activity.bulk.export.refused.one': 'يسجّل هذا القيد حركة مالية، ولا تملك صلاحية الاطلاع على المالية. اطلب من المالك صلاحية “الوصول إلى المالية”.',
  'admin.activity.bulk.export.refused.other': '{blocked} من {total} من القيود المحدَّدة تسجّل حركة مالية، ولا تملك صلاحية الاطلاع على المالية. اطلب من المالك صلاحية “الوصول إلى المالية”.',
  'admin.activity.bulk.export.refused.all': 'كل القيود المحدَّدة ({count}) تسجّل حركة مالية، ولا تملك صلاحية الاطلاع على المالية. اطلب من المالك صلاحية “الوصول إلى المالية”.',
  'admin.activity.bulk.exported': 'تم تصدير {count} من القيود',
  'admin.activity.bulk.copied': 'تم نسخ {count} من معرّفات الأحداث',
}
