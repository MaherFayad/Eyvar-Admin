/**
 * Arabic - Support > Contact Centre, the inbox (design 12 §12). One flat
 * `Dictionary`, keys mirroring `screens/support/inbox/copy.ts`. Conventions
 * from `design/20-arabic-glossary.md`: Arabic punctuation, one MSA register,
 * masdar on buttons, Western digits, all six CLDR categories on a plural.
 */

import type { Dictionary } from '@/lib'

export const INBOX_AR: Dictionary = {
  'inbox.search': 'ابحث بالاسم أو المعرّف أو الرسالة',
  'inbox.search.clear': 'مسح البحث',
  'inbox.folders.label': 'المجلدات',
  'inbox.folders.show': 'إظهار المجلدات',
  'inbox.folders.hide': 'إخفاء المجلدات',
  'inbox.folders.collapsed': '{folder} · {count}',
  'inbox.list.label': 'المحادثات',
  'inbox.list.end': 'هذه كل المحادثات في هذا المجلد.',
  'inbox.row.yours': 'لك',
  'inbox.row.select': 'تحديد المحادثة مع {name}',
  'inbox.row.age': 'آخر رسالة {age}',

  'inbox.thread.label': 'محادثة مع {name}',
  'inbox.thread.noSelection': 'اختر محادثة لقراءتها.',
  'inbox.thread.today': 'اليوم',
  'inbox.thread.yesterday': 'أمس',
  'inbox.thread.you': '{name} (أنت)',
  'inbox.thread.sentAt': 'أُرسلت في {time}',
  'inbox.thread.new#zero': 'لا رسائل جديدة',
  'inbox.thread.new#one': 'رسالة جديدة واحدة',
  'inbox.thread.new#two': 'رسالتان جديدتان',
  'inbox.thread.new#few': '{count} رسائل جديدة',
  'inbox.thread.new#many': '{count} رسالة جديدة',
  'inbox.thread.new#other': '{count} رسالة جديدة',
  'inbox.thread.new.label': 'الانتقال إلى أحدث رسالة',
  'inbox.thread.system': '{body} · {time}',
  'inbox.header.more': 'مزيد من الإجراءات',
  'inbox.header.back': 'العودة إلى المحادثات',
  'inbox.header.details': 'التفاصيل',
  'inbox.bulk.clear': 'مسح التحديد',

  'inbox.composer.label': 'الرد على {name}',
  'inbox.composer.tab.verb': 'الرد على',
  'inbox.composer.placeholder.reply': 'اكتب ردًّا إلى {name}…',
  'inbox.composer.placeholder.note': 'اكتب ملاحظة داخلية…',
  'inbox.composer.announce.reply': 'الرد. يُرسل إلى {name}.',
  'inbox.composer.announce.note': 'ملاحظة داخلية. لا تُرسل إلى العميل.',

  'inbox.rail.show': 'إظهار التفاصيل',
  'inbox.rail.hide': 'إخفاء التفاصيل',
  'inbox.rail.elsewhere': 'في مواضع أخرى من اللوحة',
  'inbox.rail.error': 'لم تُحمَّل هذه البطاقة. حاول مرة أخرى.',
  'inbox.rail.history.empty': 'لا مطالبات أو تحويلات بعد.',
  'inbox.customer.open': 'فتح الملف',
  'inbox.customer.plan': 'الخطة',
  'inbox.customer.city': 'المدينة',
}
