/**
 * Arabic for `src/screens/analyst/copy.ts`, D38. Same keys, same order.
 * "Runner" (the daemon, §3.1) is `المنفّذ`, not `المشغّل` — `reports.ts`
 * already uses that word for the human operator
 * (`rb.alert.form.recipients.blocked`), and the two must stay apart.
 */

import type { Dictionary } from '@/lib'

export const ANALYST_AR: Dictionary = {
  'an.index.title': 'المحلل',
  'an.index.empty': 'لم يُطرح أي سؤال بعد.',
  'an.index.loading': 'جارٍ تحميل مهام المحلل',
  'an.index.error': 'لم تُحمَّل المهام.',

  'an.compose.ask': 'اسأل المحلل',

  'an.runner.online': 'المنفّذ متصل · آخر ظهور {time}',
  'an.runner.offline': 'المنفّذ غير متصل',
  'an.runner.limited': 'بلغ الحد الأقصى للاستخدام حتى {time}',

  'an.job.loading': 'جارٍ تحميل المهمة',
  'an.job.error': 'لم تُحمَّل المهمة.',
  'an.provenance': 'المصدر',

  'an.job.state.queued': 'قيد الانتظار',
  'an.job.state.running': 'قيد التنفيذ',
  'an.job.state.deferred': 'مؤجَّل',
  'an.job.state.done': 'مكتمل',
  'an.job.state.failed': 'فشل',
}
