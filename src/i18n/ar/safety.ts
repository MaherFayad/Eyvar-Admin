/**
 * Arabic - Support > Safety and Incidents.
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

export const SAFETY_AR: Dictionary = {
  'safety.meta.one': 'حادثة واحدة',
  'safety.meta.other': '{count} من الحوادث',
  'safety.search': 'ابحث بالملخّص أو المُبلِّغ أو الرحلة أو المعرّف',
  'safety.col.incident': 'الحادثة',
  'safety.col.protocol': 'الإجراء',
  'safety.a11y.open': 'فتح الحادثة {id}',
  'safety.line.withTrip': '{type} · {trip}',
  'safety.line.noTrip': '{type} · لا رحلة مسجَّلة',
  'safety.line.unresolvableTrip': '{type} · {trip} غير مسجَّلة',
  'safety.type.sos': 'استغاثة',
  'safety.type.accident': 'حادث',
  'safety.type.harassment': 'تحرّش',
  'safety.type.unsafeDriving': 'قيادة غير آمنة',
  'safety.type.theft': 'سرقة',
  'safety.type.other': 'أخرى',
  'safety.severity.critical': 'حرِجة',
  'safety.severity.high': 'عالية',
  'safety.severity.normal': 'عادية',
  'safety.status.unacknowledged': 'بلا إقرار',
  'safety.status.acknowledged': 'مُقَرّ بها',
  'safety.status.closed': 'مغلقة',
  'safety.promise.acknowledge': 'موعد الإقرار',
  'safety.promise.resolve': 'موعد الحسم',
  'safety.step.contact': 'التواصل',
  'safety.step.verify': 'التحقّق',
  'safety.step.act': 'التصرّف',
  'safety.step.document': 'التوثيق',
  'safety.step.a11y': '{step} — {incident}',
  'safety.step.countLabel': 'اكتملت {done} من {total} من خطوات الإجراء',
  'safety.step.documentBlocked': 'يجب إتمام التواصل والتحقّق والتصرّف أولًا.',
  'safety.step.closed': 'إجراء الحادثة المغلقة للقراءة فقط.',
  'safety.action.close': 'إغلاق',
  'safety.action.close.help': 'إغلاق هذه الحادثة',
  'safety.action.close.blocked': 'لا تزال {count} من خطوات الإجراء معلَّقة.',
  'safety.action.close.blockedOne': 'لا تزال خطوة إجراء واحدة معلَّقة.',
  'safety.close.title': 'إغلاق {id}؟',
  'safety.close.body': 'تخرج الحادثة من قائمة العمل المفتوحة ويصبح إجراؤها للقراءة فقط. يبقى السجل، ولا يتغيّر شيء بخصوص الكابتن أو الراكب.',
  'safety.close.confirm': 'إغلاق الحادثة',
  'safety.toast.closed': 'تم إغلاق الحادثة',
  'safety.toast.step': 'تم تحديث الإجراء',
  'safety.decided.closed': 'مغلقة',
  'safety.empty.cleared.heading': 'لا شيء مفتوح',
  'safety.empty.cleared.open': 'كل حادثة عُولجت وأُغلقت.',
  'safety.empty.cleared.critical': 'لا توجد حادثة حرِجة مفتوحة.',
  'safety.empty.cleared.closed': 'لم تُغلق أي حادثة بعد.',
  'safety.empty.firstRun.heading': 'تصل حوادث السلامة هنا',
  'safety.empty.firstRun.body': 'نداء استغاثة من سيارة مسرعة، أو اصطدام، أو بلاغ ضد كابتن أو راكب — كل واحدة يستلمها شخص محدَّد وتُعالج عبر أربع خطوات.',
  'safety.empty.firstRun.action': 'عرض كل الحوادث',
  'safety.empty.noMatch': 'لا توجد حادثة تطابق هذا البحث.',
  'safety.banner.one': 'حادثة واحدة تجاوزت موعدها النهائي.',
  'safety.banner.other': '{count} من الحوادث تجاوزت موعدها النهائي.',
  'safety.error.list': 'تعذّر تحميل الحوادث. لم تتغيّر عوامل التصفية.',
  'safety.error.row.claim': 'تعذّر الاستلام.',
  'safety.error.row.release': 'تعذّر الترك.',
  'safety.error.row.step': 'تعذّر تحديث الخطوة.',
  'safety.error.row.close': 'تعذّر الإغلاق.',
}
