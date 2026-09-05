/**
 * Arabic - the shared work-queue vocabulary (src/screens/queues/copy.ts).
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

export const QUEUE_SHARED_AR: Dictionary = {
  'queue.claim': 'استلام',
  'queue.release': 'ترك',
  'queue.takeOver': 'تولٍّ',
  'queue.open': 'فتح',
  'queue.owner.unclaimed': 'غير مُستلَم',
  'queue.owner.mine': 'لك · {duration}',
  'queue.owner.heldBy': 'بحوزة {name}',
  'queue.owner.expiry': 'يُلغى الاستلام بعد {minutes} دقيقة دون نشاط.',
  'queue.takeOver.title': 'التولّي من {name}؟',
  'queue.takeOver.body': 'يفقد {name} هذا العنصر دون استئذان، ويُسجَّل الاسمان في السجل. لا يتغيّر أي شيء آخر في العنصر.',
  'queue.takeOver.confirm': 'تولٍّ',
  'queue.takeOver.decide.title': 'الحسم بدلًا من {name}؟',
  'queue.takeOver.decide.body': 'يعمل {name} على هذا العنصر الآن. حسمه ينتزعه منه دون استئذان، ويُسجَّل الاسمان في السجل.',
  'queue.takeOver.decide.confirm': 'تولٍّ وحسم',
  'queue.toast.claimed': 'تم الاستلام',
  'queue.toast.released': 'تم الترك',
  'queue.toast.takenOver': 'تم التولّي',
  'queue.sla.missed': 'فات موعده {date}',
  'queue.showBreached': 'عرض ما تجاوز الموعد النهائي فقط',
  'queue.filter.breached': 'تجاوز الموعد النهائي',
  'queue.filter.breached.yes': 'تجاوز موعده النهائي',
  'queue.filter.breached.no': 'ضمن موعده النهائي',
  'queue.decided.late': 'متأخر',
  'queue.decided.by': '{actor} · {date}',
  'queue.decided.bySystem': 'آلي · {date}',
  'queue.confirm.cancel': 'إلغاء',
  'queue.action.noPermission': 'لا يمكنك استلام العمل في قائمة العمل هذه أو التصرّف فيه. اطلب من المالك الصلاحية التي تتطلبها هذه القائمة.',
  'queue.error.retry': 'إعادة المحاولة',
  'queue.col.owner': 'المالك',
  'queue.col.sla': 'الموعد النهائي',
  'queue.col.status': 'الحالة',
  'queue.col.decision': 'القرار',
  'queue.col.id': 'المعرّف',
  'queue.col.opened': 'تاريخ الفتح',
  'queue.col.severity': 'درجة الخطورة',
  'queue.col.reason': 'السبب',
  'queue.col.queue': 'قائمة العمل',
  'queue.col.subject': 'الموضوع',
  'queue.col.captain': 'الكابتن',
  'queue.col.rider': 'الراكب',
  'queue.col.route': 'المسار',
  'queue.col.plan': 'الباقة',
  'queue.col.type': 'النوع',
  'queue.col.actions': 'الإجراءات',
  'queue.meta.items.one': 'عنصر واحد',
  'queue.meta.items.other': '{count} من العناصر',
}
