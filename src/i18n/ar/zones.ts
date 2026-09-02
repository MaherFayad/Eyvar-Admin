/**
 * Arabic - Management > Market and Zones.
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

export const ZONES_AR: Dictionary = {
  'zones.meta': '{zones} منطقة · {starved} تعاني نقص العرض · {cities} من {allCities} مدينة تعمل',
  'zones.search': 'ابحث في المناطق',
  'zones.tile.captainsNeeded': 'الكباتن المطلوبون',
  'zones.tile.starvedZones': 'المناطق التي تعاني نقص العرض',
  'zones.tile.unservedRequests30d': 'الطلبات غير المخدومة، 30 يومًا',
  'zones.tile.avgFailureRate': 'متوسط معدل إخفاق الطلبات',
  'zones.tile.worstDemandSupplyRatio': 'أسوأ نسبة طلب إلى عرض',
  'zones.col.zone': 'المنطقة',
  'zones.col.demandSupply': 'الطلب : العرض',
  'zones.col.failureRate': 'معدل الإخفاق',
  'zones.col.captainsNeeded': 'الكباتن المطلوبون',
  'zones.col.subMomentum': 'زخم الاشتراكات',
  'zones.col.priority': 'الأولوية',
  'zones.col.actions': 'الإجراءات',
  'zones.demandSupply.detail': '{demand} طلب · {supply} كابتن',
  'zones.unserved.detail': '{count} غير مخدوم',
  'zones.priority.recruit-now': 'التوظيف الآن',
  'zones.priority.watch': 'مراقبة',
  'zones.priority.healthy': 'سليمة',
  'zones.action.steer': 'توجيه الكباتن',
  'zones.action.recruit': 'جدولة حملة توظيف',
  'zones.blocked.permission': 'لا يمكنك التصرّف في منطقة. اطلب من المالك صلاحية “السياسة التشغيلية”.',
  'zones.steer.blocked.live': 'هناك عرض قائم هنا بالفعل. دعه ينتهي قبل إطلاق آخر.',
  'zones.recruit.blocked.queued': 'هناك حملة توظيف مجدولة هنا بالفعل.',
  'zones.steer.title': 'توجيه الكباتن إلى {zone}؟',
  'zones.steer.body': 'الكباتن مستقلون — والعرض دعوة يقبلها كل منهم أو يتجاهلها. يستمر {hours} ساعة أو حتى يُصرف {cap}، أيهما أسبق، ولا يمكن تمديده.',
  'zones.steer.confirm': 'إرسال العرض',
  'zones.steer.amount.label': 'المكافأة عن كل رحلة مكتملة في المنطقة',
  'zones.steer.amount.help': 'تُدفع فوق الأجرة، عن كل رحلة، داخل هذه المنطقة.',
  'zones.steer.amount.message': 'أدخل مبلغًا لا يتجاوز {cap}.',
  'zones.toast.steered': 'العرض قائم',
  'zones.toast.recruited': 'تمت جدولة حملة التوظيف',
  'zones.error.read': 'غيّر عوامل التصفية، ثم أعد القراءة.',
  'zones.error.retry': 'إعادة القراءة',
  'zones.error.row': 'لم يتم ذلك. أعد المحاولة.',
  'zones.noMatch': 'لا توجد منطقة تطابق عوامل التصفية هذه.',
  'zones.noMatch.action': 'عرض كل المناطق',
  'zones.empty.heading': 'حيث يلتقي الطلب بالعرض، حيًّا بحي',
  'zones.empty.body': 'المنطقة حيّ يُقاس فيه الطلب والعرض. لا توجد منطقة متتبَّعة في هذه المدينة بعد.',
  'zones.empty.action': 'عرض كل المناطق',
  'zones.map.heading': 'خريطة المناطق',
  'zones.map.a11y.desc': '{count} منطقة، مظلَّلة حسب {metric}. كل منطقة مدرجة أيضًا بجانب الخريطة.',
  'zones.map.metric.label': 'التظليل حسب',
  'zones.map.metric.ratio': 'الطلب إلى العرض',
  'zones.map.metric.failure': 'معدل الإخفاق',
  'zones.map.metric.demand': 'الطلبات',
  'zones.map.reading.demand': '{count} طلب',
  'zones.map.shading.on': 'إخفاء التظليل',
  'zones.map.shading.off': 'إظهار التظليل',
  'zones.map.legend.low': 'أقل',
  'zones.map.legend.high': '{metric} أعلى',
  'zones.map.unmapped': 'لا توجد حدود مسجَّلة لـ{zones}.',
  'zones.map.list.heading': 'المناطق',
  'zones.map.search': 'ابحث في المناطق',
  'zones.map.noMatch': 'لا توجد منطقة تطابق هذا البحث.',
  'zones.map.noMatch.action': 'مسح البحث',
  'zones.map.empty': 'لم يُسجَّل شيء هنا بعد.',
  'zones.map.loading': 'جارٍ رسم خريطة المناطق',
  'zones.map.error': 'غيّر عوامل التصفية، ثم أعد القراءة لإعادة رسم الخريطة.',
  'zones.map.error.final': 'لا يمكن رسم الخريطة بهذا الدور وهذه التصفية.',
  'zones.map.inspector.heading': 'تفاصيل المنطقة',
  'zones.map.inspector.none': 'اختر منطقة على الخريطة أو من القائمة لعرض تفاصيلها.',
  'zones.map.captainsNeeded': '{count} كابتن إضافي يبلغ 3 طلبات لكل كابتن هنا.',
}
