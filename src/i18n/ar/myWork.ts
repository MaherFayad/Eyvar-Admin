/**
 * Arabic - Operations > My Work.
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

export const MY_WORK_AR: Dictionary = {
  'myWork.meta#zero': 'لا عناصر',
  'myWork.meta#one': 'عنصر واحد',
  'myWork.meta#two': 'عنصران',
  'myWork.meta#few': '{count} عناصر',
  'myWork.meta#many': '{count} عنصراً',
  'myWork.meta#other': '{count} عنصر',
  'myWork.meta.hint': 'ما تحمله وما لم يُستلَم، في كل قوائم العمل. والجدول يعدّ هذا العرض.',
  'myWork.search': 'ابحث بالموضوع أو المعرّف أو قائمة العمل',
  'myWork.col.item': 'العنصر',
  'myWork.item.text': '{text}',
  'myWork.item.application': '{name}',
  'myWork.item.application.sub': 'طلب انضمام كابتن · {vehicleClass} · {documents} بانتظار التحقق',
  'myWork.item.application.sub.clear': 'طلب انضمام كابتن · {vehicleClass} · تم التحقق من كل المستندات',
  'myWork.item.request.instant': '{pickup} ← {destination}',
  'myWork.item.request.subscription': '{rider}',
  'myWork.item.request.instant.sub': 'طلب رحلة · {rider} · {vehicleClass}',
  'myWork.item.request.instant.sub.noCaptain': 'طلب رحلة · {rider} · لا يوجد كابتن',
  'myWork.item.request.subscription.sub': 'طلب اشتراك · {vehicleClass}',
  'myWork.item.request.subscription.sub.noCaptain': 'طلب اشتراك · {vehicleClass} · لا يوجد كابتن',
  'myWork.item.assurance': '{subscription}',
  'myWork.item.assurance.sub.uncovered': 'رحلة بلا تغطية · {rider} · {plan}',
  'myWork.item.assurance.sub.unconfirmed': 'رحلة غير مؤكدة · {rider} · {captain}',
  'myWork.item.assurance.sub.unconfirmed.noCaptain': 'رحلة غير مؤكدة · {rider} · لم يُسنَد كابتن',
  'myWork.item.incident': '{type} · {id}',
  'myWork.item.fairness': '{captain}',
  'myWork.item.fairness.sub': '{kind} · {text}',
  'myWork.item.ticket': '{id} · {entity}',
  'myWork.item.ticket.sub': '{category} · {subject}',
  'myWork.item.dispute': '{claimant}',
  'myWork.item.dispute.sub': '{kind} · ضد {name}',
  'myWork.item.dispute.sub.platform': '{kind} · ضد إيفار',
  'myWork.a11y.open': 'فتح {title}',
  'myWork.action.open': 'فتح',
  'myWork.action.open.help': 'فتح هذا العنصر في قائمة العمل التي يتبعها',
  'myWork.queue.request': 'الطلبات',
  'myWork.queue.assurance': 'ضمان الرحلات',
  'myWork.queue.absence': 'الغيابات',
  'myWork.queue.incident': 'السلامة والحوادث',
  'myWork.queue.fairness': 'إنصاف الكباتن',
  'myWork.queue.application': 'طلبات الانضمام',
  'myWork.queue.ticket': 'التذاكر',
  'myWork.queue.dispute': 'النزاعات',
  'myWork.queue.erasure': 'البيانات وسلامتها',
  'myWork.severity.critical': 'حرِجة',
  'myWork.severity.high': 'عالية',
  'myWork.severity.normal': 'عادية',
  'myWork.routing.chip': 'توجيه قوائم العمل',
  'myWork.routing.clear': 'عرض كل قوائم العمل',
  'myWork.routing.yes': 'دورك',
  'myWork.routing.no': 'أدوار أخرى',
  'myWork.bulk.claim': 'استلام',
  'myWork.action.claim.blocked.one': 'هذا العنصر مُستلَم بالفعل، أو أن قائمة عمله غير موصولة بعد.',
  'myWork.action.claim.blocked.other': '{count} من العناصر المحدَّدة مُستلَمة بالفعل، أو أن قوائم عملها غير موصولة بعد.',
  'myWork.action.claim.blocked.all': 'كل العناصر المحدَّدة ({count}) مُستلَمة بالفعل، أو أن قوائم عملها غير موصولة بعد.',
  'myWork.toast.claimed#zero': 'لم يُستلم أي عنصر',
  'myWork.toast.claimed#one': 'تم استلام عنصر واحد',
  'myWork.toast.claimed#two': 'تم استلام عنصرين',
  'myWork.toast.claimed#few': 'تم استلام {count} عناصر',
  'myWork.toast.claimed#many': 'تم استلام {count} عنصراً',
  'myWork.toast.claimed#other': 'تم استلام {count} عنصر',
  'myWork.claim.unavailable': 'استلم هذا من {queue}. لم تُبنَ بعد.',
  'myWork.empty.cleared.heading': 'لا شيء معلَّق',
  'myWork.empty.cleared.mine': 'لا تحمل أي عنصر. هناك عمل غير مُسنَد بانتظار من يستلمه.',
  'myWork.empty.cleared.unassigned': 'كل عنصر مفتوح في قوائم العمل يعمل عليه أحد.',
  'myWork.empty.cleared.everything': 'كل قوائم العمل خالية.',
  'myWork.empty.routed': 'لا يوجد عمل مفتوح في قوائم العمل الموجَّهة إلى دورك.',
  'myWork.routed.hint': 'قد يكون في قوائم العمل الأخرى عمل مفتوح.',
  'myWork.empty.firstRun.heading': 'عملك في كل قوائم العمل',
  'myWork.empty.firstRun.body': 'كل ما تحمله أو لم يستلمه أحد، مرتَّبًا حسب الموعد النهائي.',
  'myWork.empty.firstRun.action': 'عرض كل قوائم العمل',
  'myWork.firstRun.hint':
    'يشمل كل قوائم العمل من الطلبات إلى السلامة، مرتَّبًا حسب الموعد النهائي لا حسب التصنيف.',
  'myWork.empty.noMatch': 'لا يوجد عنصر يطابق هذا البحث.',
  'myWork.banner.one': 'عنصر واحد تراه تجاوز موعده النهائي.',
  'myWork.banner.other': '{count} من العناصر التي تراها تجاوزت موعدها النهائي.',
  'myWork.error.list': 'تعذّر تحميل عملك. لم تتغيّر عوامل التصفية.',
  'myWork.error.row.claim': 'تعذّر الاستلام.',
  'myWork.error.row.release': 'تعذّر الترك.',
}
