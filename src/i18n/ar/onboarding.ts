/**
 * Arabic - the getting-started checklist.
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

export const ONBOARDING_AR: Dictionary = {
  'onboarding.title': 'البدء',
  'onboarding.menuEntry': 'البدء',
  'onboarding.menuCount': '{done} / {total}',
  'onboarding.close': 'إغلاق',
  'onboarding.progress': 'اكتمل {done} من {total}',
  'onboarding.skipped': 'متخطّاة ({count})',
  'onboarding.archived': 'اكتملت في ظل دور سابق ({count})',
  'onboarding.restart': 'إعادة بدء التهيئة',
  'onboarding.dismiss': 'تجاهل',
  'onboarding.intro.owner': 'أنت مسؤول عن اللوحة كاملة — السياسة والأشخاص والمال والقرارات التي لا يستطيع غيرك اتخاذها.',
  'onboarding.intro.opsManager': 'أنت من يبقي الرحلات مغطّاة والكباتن على رأس العمل — الطلبات المقدَّمة وطلبات الرحلات وضمان الرحلات والتوزيع.',
  'onboarding.intro.finance': 'أنت من يحرّك المال ويحاسب عليه — المستحقات والضمان والخصومات والتسوية. يمكنك الاطلاع على الملفات الشخصية، ولا يمكنك تغيير حالة كابتن.',
  'onboarding.intro.support': 'أنت من يجيب الركاب والكباتن، وأول من يسمع حين يسوء شيء. يمكنك رؤية حادثة سلامة ولا يمكنك البتّ فيها — ذلك لمدير العمليات.',
  'onboarding.intro.permissions': 'تملك {held} من {total} من الصلاحيات.',
  'onboarding.intro.myWork': 'يصل العمل المُسنَد إليك في {subTab}.',
  'onboarding.step.open': 'فتح {subTab}',
  'onboarding.step.markDone': 'تعليم كمنجَز',
  'onboarding.step.skip': 'تخطّي هذه الخطوة',
  'onboarding.step.doThis': 'تنفيذ هذه الخطوة',
  'onboarding.step.unbuilt': '{subTab} لم يُبنَ بعد. ستُفتح هذه الخطوة حين يُبنى.',
  'onboarding.step.forbidden': 'تتطلب هذه الخطوة صلاحية “{permission}”. يمكن للمالك منحها من إدارة النظام › الفريق والصلاحيات.',
  'onboarding.step.a11y.completed': '{title}، مكتملة',
  'onboarding.step.a11y.skipped': '{title}، متخطّاة',
  'onboarding.step.a11y.unavailable': '{title}، غير متاحة',
  'onboarding.trackEmpty': 'لا توجد خطوات متاحة لهذا الدور بعد — يمكن للمالك مراجعة صلاحياتك من إدارة النظام › الفريق والصلاحيات.',
  'onboarding.error': 'تعذّر تحميل قائمتك. لم يتغيّر شيء.',
  'onboarding.tryAgain': 'إعادة المحاولة',
  'onboarding.error.mark': 'تعذّر تعليم هذه الخطوة كمنجَزة.',
  'onboarding.error.skip': 'تعذّر تخطّي هذه الخطوة.',
  'onboarding.error.dismiss': 'تعذّر تجاهل القائمة.',
  'onboarding.error.restart': 'تعذّرت إعادة بدء القائمة.',
  'onboarding.stale': 'أُنجزت هذه الخطوة بالفعل في تبويب آخر.',
  'onboarding.done': 'اكتملت كل الخطوات',
  'onboarding.doneBody': 'أنهيت قائمة {role}. يمكنك فتحها في أي وقت من قائمة حسابك.',
  'onboarding.roleChanged': 'تغيّر دورك إلى {role}.',
  'onboarding.openChecklist': 'فتح القائمة',
  'onboarding.step.common.account.title': 'راجع الحساب الذي صار لك',
  'onboarding.step.common.account.body': 'أكّد الرقم الذي تصل إليه رموزك، ثم راجع جلساتك النشطة وأنهِ ما لا تعرفه.',
  'onboarding.step.common.mywork.title': 'استلم عنصرًا واحدًا، ثم اتركه',
  'onboarding.step.common.mywork.body': 'العمليات › عملي هي حيث تصلك كل قائمة عمل. استلم شيئًا من «غير مُسنَد» ثم اتركه، لتتعلّم ما معنى الاستلام قبل أن تحمل ستة.',
  'onboarding.step.common.audit.title': 'ابحث عن اسمك في سجل النشاط',
  'onboarding.step.common.audit.body': 'كل ما تفعله هنا يُسجَّل باسمك. اقرأ السجل مرة، واقرأ من المناوب، لتعرف بمن تتصل في الثانية صباحًا.',
  'onboarding.step.owner.team.title': 'اقرأ مصفوفة الأدوار، وقرّر إن كانت لا تزال صالحة',
  'onboarding.step.owner.team.body': 'حساب واحد يملك manage_settings، وهذا المفتاح يتحكّم في 39 من أصل 131 فحص صلاحية في اللوحة. قرّر إن كان ذلك لا يزال مقبولًا.',
  'onboarding.step.owner.policy.title': 'اقرأ السياسة التي أنت مسؤول عنها',
  'onboarding.step.owner.policy.body': 'نطاق التوزيع وحدود التشغيل وأهداف SLA ورموز الأسباب. اقرأها مرة واحدة عن قصد، لا عند أول اعتراض عليها.',
  'onboarding.step.owner.position.title': 'اذكر هامش المساهمة الحالي',
  'onboarding.step.owner.position.body': 'ميزان المراجعة وهامش المساهمة هما الرقمان اللذان ستُسأل عنهما. هنا موضعهما، وتكتمل هذه الخطوة حين تستطيع ذكرهما بصوت مسموع.',
  'onboarding.step.owner.pricing.title': 'احسم كيف يُدفع للكباتن',
  'onboarding.step.owner.pricing.body': 'تحتسب اللوحة أرباح الكابتن بأربع طرق مختلفة، ولم يختر أحد واحدة منها. هذا القرار معلَّق، وهو قرارك.',
  'onboarding.step.finance.ledger.title': 'اقرأ دفتر أستاذ قبل أن تقيّد فيه',
  'onboarding.step.finance.ledger.body': 'تعلّم اصطلاح الإشارة، وتعلّم أن الصف المُقيَّد لا يُعدَّل أبدًا — بل يُعكَس بصف ثانٍ. لا شيء في المالية يتراجع عن نفسه.',
  'onboarding.step.finance.escrow.title': 'اقرأ ماذا يفعل الإفراج عن الضمان، دون أن تفرج عنه',
  'onboarding.step.finance.escrow.body': 'افتح صف ضمان واحدًا واقرأه كاملًا. الإفراج ينقل المال إلى كابتن، ولا تراجع عنه — إلا بقيد عكسي.',
  'onboarding.step.finance.reconciliation.title': 'عالج بندًا واحدًا من التسوية من أوله إلى آخره',
  'onboarding.step.finance.reconciliation.body': 'استلمه، وابتّ فيه، وشاهد الصف يتحوّل في مكانه. هذه القائمة هي ما يبقي النقد ومديونية الكباتن متطابقين.',
  'onboarding.step.finance.goodwill.title': 'اعرف الحد الذي يقيّد رصيد حُسن النية',
  'onboarding.step.finance.goodwill.body': 'تتشارك مع الدعم حدًّا واحدًا للتعويض. اعرف الرقم قبل أن يطلب منك راكب تجاوزه.',
  'onboarding.step.finance.routing.title': 'اعرف أي قائمة عمل تصل إليك',
  'onboarding.step.finance.routing.body': 'تُوجَّه النزاعات إلى المالية. أوقف توجيه الأدوار مرة في «عملي» وانظر ما الذي يتغيّر، لتعرف ما الذي تستبعده.',
  'onboarding.step.ops.application.title': 'ابتّ في طلب كابتن واحد من أوله إلى آخره',
  'onboarding.step.ops.application.body': 'اقرأ المستندات، ثم وافق أو ارفض. يمنحك الصف علامة صح وعلامة خطأ و«عرض» — لا قائمة تُفتح.',
  'onboarding.step.ops.requests.title': 'استلم طلبًا واحدًا وعالجه وابتّ فيه',
  'onboarding.step.ops.requests.body': 'راقب مؤقّت SLA وأنت تحمله. اقرأ ما معنى الإخلال — الإخلال هدف لم يُدرَك، لا تقصير في التصرّف.',
  'onboarding.step.ops.assurance.title': 'غطِّ رحلة واحدة قبل مغادرتها',
  'onboarding.step.ops.assurance.body': 'يعرض ضمان الرحلات الاشتراكات التي بلا كابتن بديل. سجّل كابتن على إحداها أو استبدله.',
  'onboarding.step.ops.dispatch.title': 'ميّز بين تغذية متأخرة وأخرى متوقفة',
  'onboarding.step.ops.dispatch.body': 'يعرض التوزيع المباشر سطر حداثة البيانات. تعلّم الفرق بين بيانات متأخرة وبيانات توقّفت، قبل أن تتصرّف بناءً على أيٍّ منهما.',
  'onboarding.step.ops.fairness.title': 'اقرأ تظلّمًا واحدًا من إيقاف من جهة الكابتن',
  'onboarding.step.ops.fairness.body': 'يُظهر لك إنصاف الكباتن الاقتصاديات التي يسلبها الإيقاف. اقرأ واحدًا قبل أن يُطلب منك تبرير قرار.',
  'onboarding.step.support.ticket.title': 'أجب عن تذكرة واحدة من أولها إلى آخرها',
  'onboarding.step.support.ticket.body': 'افتحها، ورُدَّ عليها، وأغلقها برمز سبب. رمز السبب هو ما يجعل التذكرة قابلة للإحصاء لاحقًا.',
  'onboarding.step.support.profile.title': 'افتح ملفًا شاملًا، واعرف ما لا يجوز لك فعله به',
  'onboarding.step.support.profile.body': 'يحمل الملف الواحد كل بيان شخصي تحتفظ به اللوحة عن شخص، عبر 11 نوعًا من السجلات. لا تفتحه إلا حين يحتاجه العمل الذي أمامك.',
  'onboarding.step.support.goodwill.title': 'امنح راكبًا رصيدًا، ضمن حدّك',
  'onboarding.step.support.goodwill.body': 'هذا هو الإجراء المالي الوحيد الذي تتخذه أثناء المكالمة، وهو مقيَّد بالسياسة. اعرف الحد قبل أن تحتاجه.',
  'onboarding.step.support.boundary.title': 'اعرف ما لا يجوز لك البتّ فيه، ومن يبتّ فيه',
  'onboarding.step.support.boundary.body': 'يمكنك رؤية كل حادثة سلامة ولا يمكنك البتّ فيها — ذلك لمدير العمليات. اقرأ حادثة واحدة، وقف عند ذلك.',
}
