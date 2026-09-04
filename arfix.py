# -*- coding: utf-8 -*-
import io

NEW = {
    'zones.meta': '{starved}/{zones} تعاني نقص العرض · {cities}/{allCities} مدينة تعمل',
    'zones.tile.starvedZones': 'مناطق نقص العرض',
    'zones.tile.worstDemandSupplyRatio': 'أسوأ نسبة طلب/عرض',
    'zones.tile.captainsNeeded.note': 'لسد نقص العرض',
    'zones.steer.body': 'العرض دعوة. يقبلها كل كابتن أو يتجاهلها. يستمر {hours} ساعة أو حتى يُصرف {cap}، ولا يمكن تمديده.',
    'zones.empty.heading': 'لا توجد منطقة متتبَّعة بعد',
    'zones.empty.body': 'المنطقة حيّ يُقاس فيه الطلب والعرض.',
}

path = 'src/i18n/ar/zones.ts'
lines = io.open(path, encoding='utf-8').read().split('\n')
seen = set()
for i, line in enumerate(lines):
    for key, value in NEW.items():
        if line.strip().startswith("'%s':" % key):
            lines[i] = "  '%s': '%s'," % (key, value)
            seen.add(key)
io.open(path, 'w', encoding='utf-8').write('\n'.join(lines))
missing = set(NEW) - seen
print('replaced', len(seen), 'missing', missing)
