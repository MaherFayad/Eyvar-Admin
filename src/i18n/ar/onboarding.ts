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
  'onboarding.intro.dispatcher': 'أنت من يبقي لوحة التوزيع خالية: الطلبات والرحلات الجارية والكباتن الذين يغطّونها. التسعير والموافقات لمدير العمليات.',
  'onboarding.intro.trustSafety': 'أنت من يبتّ في حوادث السلامة والاستئنافات وإيقاف الكباتن. تقرأ التحليلات والطوابير؛ أما المال والإعدادات فليست لك.',
  'onboarding.intro.permissions': 'تملك {held} من {total} من الصلاحيات.',
  'onboarding.intro.myWork': 'يصل العمل المُسنَد إليك في {subTab}.',
  'onboarding.intro.commonDone': 'اكتملت الخطوات الثلاث المشتركة. ما تبقّى يخصّ دورك.',
  'onboarding.intro.welcome': 'مرحبًا، {name}',
  'onboarding.group.common': 'خطواتك الثلاث الأولى',
  'onboarding.group.role': 'لدورك',
  'onboarding.welcome.eyebrow': 'Eyvar Admin',
  'onboarding.welcome.title': 'مرحبًا، {name}',
  'onboarding.welcome.step1.body':
    'الركّاب يشتركون، والكباتن يقودون، وهذه اللوحة هي المكان الذي يُبقي فيه الفريق الطرفين يتحرّكان: الرحلات والمحافظ والمدفوعات وكل طابور بينها.',
  'onboarding.welcome.step1.reach': 'يصل دورك إلى {workspaces}.',
  'onboarding.welcome.step2.title': 'يصل عملك إلى مكان واحد',
  'onboarding.welcome.step2.body':
    'كل طابور يمكنك رؤيته يصل إلى «عملي». استلم عنصرًا ليصبح لك، واعمل عليه في شاشته، ثم اتركه. لا يُسنَد إليك شيء في صمت.',
  'onboarding.welcome.step3.title': 'انتقل من لوحة المفاتيح',
  'onboarding.welcome.step3.body':
    'اضغط ⌘K، أو Ctrl K على ويندوز، لفتح طابور، أو العثور على سجل بمعرّفه، أو تنفيذ إجراء من دون مغادرة الصفحة التي أنت فيها.',
  'onboarding.welcome.step4.title': 'مهامك الأولى: {count}',
  'onboarding.welcome.step4.body':
    '{count} مهام حقيقية على شاشات حقيقية، مختارة لدورك. تعلّم اللوحة الخطوة لحظة إنجازها. عُد في أي وقت من الحلقة في الزاوية أو من قائمة حسابك.',
  'onboarding.welcome.next': 'التالي',
  'onboarding.welcome.back': 'السابق',
  'onboarding.welcome.start': 'ابدأ القائمة',
  'onboarding.welcome.later': 'ليس الآن',
  'onboarding.welcome.progress': 'الخطوة {current} من {total}',
  'onboarding.welcome.image.mywork': 'عملي، مع العناصر المستلَمة ومواعيدها',
  'onboarding.welcome.image.palette': 'لوحة الأوامر، تعرض الطوابير التي فيها عناصر منتظرة',
  'onboarding.beacon.label': 'البدء، اكتمل {done} من {total}',
  'onboarding.beacon.open': 'فتح القائمة الكاملة',
  'onboarding.beacon.hide': 'إخفاء حتى تسجيل الدخول التالي',
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
  'onboarding.step.common.account.body':
    'تأكّد أن رقم الهاتف الذي تصل إليه رموز الدخول هو رقمك، ثم راجع الأجهزة المسجّلة الدخول إلى هذا الحساب وأنهِ أي جلسة لا تعرفها. تكتمل الخطوة عندما تكون كل جلسة في القائمة جلسة بدأتها أنت.',
  'onboarding.step.common.mywork.title': 'استلم عنصرًا واحدًا، ثم اتركه',
  'onboarding.step.common.mywork.body':
    'عملي هو المكان الذي يصل إليك فيه كل طابور. اختر أي عنصر تحت غير مُسنَد، واستلمه، ثم اتركه. تلاحظ القائمة ذلك لحظة استلامك أي عنصر.',
  'onboarding.step.common.audit.title': 'ابحث عن اسمك في سجل النشاط',
  'onboarding.step.common.audit.body':
    'كل إجراء في اللوحة يُكتب في سجل النشاط مع اسم من نفّذه. ابحث عن إجراء من إجراءاتك، ثم اقرأ جدول المناوبة لتعرف من تتواصل معه خارج ساعات العمل.',
  'onboarding.step.owner.team.title': 'اقرأ مصفوفة الأدوار، وقرّر إن كانت لا تزال صالحة',
  'onboarding.step.owner.team.body':
    'يعرض الفريق والصلاحيات كل مشغّل وما يستطيع كل دور فعله. اقرأه مرة وقرّر ما إذا كان ينبغي أن يبقى حساب واحد حاملًا لكل الصلاحيات الإدارية.',
  'onboarding.step.owner.policy.title': 'اقرأ السياسة التي أنت مسؤول عنها',
  'onboarding.step.owner.policy.body':
    'تحدّد السياسة التشغيلية نطاق الإرسال وحدود التشغيل وأهداف اتفاقية مستوى الخدمة ورموز الأسباب التي يختار منها المشغّلون. أنت المسؤول عن هذه القيم، فاقرأها بتمعّن مرة واحدة.',
  'onboarding.step.owner.position.title': 'اذكر هامش المساهمة الحالي',
  'onboarding.step.owner.position.body':
    'تعرض المالية › نظرة عامة هامش المساهمة وميزان المراجعة. هذان هما الرقمان اللذان ستُسأل عنهما؛ تكتمل الخطوة عندما تستطيع ذكرهما من دون النظر.',
  'onboarding.step.owner.pricing.title': 'احسم كيف يُدفع للكباتن',
  'onboarding.step.owner.pricing.body':
    'يحسب التسعير والخطط أرباح الكباتن بأربع طرق مختلفة ولم يختر أحد إحداها بعد. اقرأ الخيارات؛ القرار قرارك وما زال مفتوحًا.',
  'onboarding.step.finance.ledger.title': 'اقرأ دفتر أستاذ قبل أن تقيّد فيه',
  'onboarding.step.finance.ledger.body':
    'الإيرادات والاستردادات دفتر أستاذ. اقرأ قاعدة الإشارة ولاحظ أن القيد المرحَّل لا يُعدَّل أبدًا: يُعكس الخطأ بقيد جديد. تكتمل الخطوة عندما تستطيع شرح ذلك لزميل.',
  'onboarding.step.finance.escrow.title': 'اقرأ ماذا يفعل الإفراج عن الضمان، دون أن تفرج عنه',
  'onboarding.step.finance.escrow.body':
    'افتح صف ضمان واحدًا واقرأ ما سيفعله الإفراج عنه برصيد الكابتن ومحفظة الراكب. لا تُفرج عنه. تكتمل الخطوة عندما تعرف بالضبط ما الذي يحرّكه الزر.',
  'onboarding.step.finance.reconciliation.title': 'عالج بندًا واحدًا من التسوية من أوله إلى آخره',
  'onboarding.step.finance.reconciliation.body':
    'طابور التسوية عمل حقيقي. استلم تقرير نقد واحدًا، وقرّر بشأنه، وراقب الصف يتحوّل في مكانه. تكتمل الخطوة عندما يكون قرارك على الصف.',
  'onboarding.step.finance.goodwill.title': 'اعرف الحد الذي يقيّد رصيد حُسن النية',
  'onboarding.step.finance.goodwill.body':
    'أرصدة حسن النية محدودة بسقف تحدّده السياسة، لك ولفريق الدعم. اعثر على السقف في عرض حسن النية قبل اليوم الذي تحتاجه فيه.',
  'onboarding.step.finance.routing.title': 'اعرف أي قائمة عمل تصل إليك',
  'onboarding.step.finance.routing.body':
    'تُوجَّه النزاعات إلى المالية. في عملي، أوقف توجيه الأدوار مرة وانظر كيف تتغيّر القائمة، ثم أعد تشغيله. تكتمل الخطوة عندما تعرف أي الطوابير تصل إليك.',
  'onboarding.step.ops.application.title': 'ابتّ في طلب كابتن واحد من أوله إلى آخره',
  'onboarding.step.ops.application.body':
    'افتح طلب كابتن واحدًا، واقرأ المستندات، ثم اقبله أو ارفضه. تكتمل الخطوة عندما يحمل الطلب قرارًا باسمك.',
  'onboarding.step.ops.requests.title': 'استلم طلبًا واحدًا وعالجه وابتّ فيه',
  'onboarding.step.ops.requests.body':
    'استلم طلب رحلة واحدًا، وراقب عدّاد اتفاقية مستوى الخدمة، ثم أنهِه. اقرأ ما يعنيه الإخلال قبل أن يحدث في مناوبتك.',
  'onboarding.step.ops.assurance.title': 'غطِّ رحلة واحدة قبل مغادرتها',
  'onboarding.step.ops.assurance.body':
    'يعرض ضمان الرحلات الاشتراكات التي لا كابتن احتياطيًا لها. سجّل كابتنًا أو استبدله في واحد منها قبل انطلاق الرحلة.',
  'onboarding.step.ops.dispatch.title': 'ميّز بين تغذية متأخرة وأخرى متوقفة',
  'onboarding.step.ops.dispatch.body':
    'يعرض الإرسال المباشر كل رحلة قيد التنفيذ. اقرأ سطر الحداثة في الأعلى وتعلّم الفرق بين بثّ بطيء وبثّ توقّف.',
  'onboarding.step.ops.fairness.title': 'اقرأ تظلّمًا واحدًا من إيقاف من جهة الكابتن',
  'onboarding.step.ops.fairness.body':
    'يضم إنصاف الكباتن طعون الإيقاف. افتح واحدًا واقرأ عرض اقتصاديات الكابتن، لأن هذه هي الحالة التي ستُطلب منك الإجابة عنها.',
  'onboarding.step.support.ticket.title': 'أجب عن تذكرة واحدة من أولها إلى آخرها',
  'onboarding.step.support.ticket.body':
    'افتح تذكرة واحدة، وردّ عليها، ثم أغلقها برمز سبب. رمز السبب هو ما يجعل التذكرة قابلة للإحصاء لاحقًا.',
  'onboarding.step.support.profile.title': 'افتح ملفًا شاملًا، واعرف ما لا يجوز لك فعله به',
  'onboarding.step.support.profile.body':
    'يحوي الملف الشخصي كل بيانات شخصية تملكها اللوحة عن شخص ما. افتحه من أي صف راكب أو كابتن، ولا تفتحه إلا عندما يتطلّب العمل الذي أمامك ذلك.',
  'onboarding.step.support.goodwill.title': 'امنح راكبًا رصيدًا، ضمن حدّك',
  'onboarding.step.support.goodwill.body':
    'رصيد حسن النية هو الإجراء المالي الوحيد الذي تتخذه أثناء مكالمة، وتحدّه السياسة بسقف. اعثر على سقفك في عرض حسن النية قبل أن تحتاجه.',
  'onboarding.step.support.boundary.title': 'اعرف ما لا يجوز لك البتّ فيه، ومن يبتّ فيه',
  'onboarding.step.support.boundary.body':
    'يمكنك رؤية حادثة سلامة ولا يمكنك البتّ فيها؛ مدير العمليات هو من يفعل ذلك. افتح السلامة والحوادث مرة لتعرف ما ستنظر إليه عندما تصل مكالمة.',
}
