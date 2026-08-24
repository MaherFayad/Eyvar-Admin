# Global: Internationalisation & Localisation

> **Source file:** `eyvar_ops_panel_v40_fixed.html` (21,857 lines)
> **Primary line ranges:** RTL stylesheet `L370–L406` (+ `L24–L31`, `L424–L437`); `data-i18n` markup `L486–L1992`; language selector markup `L1495–L1500`; config seed `L2570`; translation dictionary `LANG_STRINGS` `L7903–L7938`; `applyLanguage()` `L7939–L7953`; `renderGeneralConfig()` `L7980–L7985`; `saveGeneralConfig()` `L7986–L8002`; boot call `L14596`; RTL-aware JS `L2214–L2223`, `L5236–L5256`; Arabic DB fields `L2890–L2895`, `L5992–L5995`, `L14669–L14715`

---

## 1. Purpose

A **partial, shell-only** English↔Arabic toggle. The author documents both the intent and the boundary in a comment immediately above the dictionary (`L7897–L7902`):

> "Real translation for the always-visible shell (sidebar nav + section labels) plus basic RTL layout. Deep page content — tables, forms, every dynamically-built string — stays English-only; translating thousands of generated strings throughout this file is a genuinely separate, much larger project than this toggle can honestly cover."

And again in the RTL block (`L370–L381`):

> "RTL (Arabic) — scoped to the sidebar shell only, which is the part actually translated. Page content stays LTR/English since it isn't translated — mirroring layout without translated text would look broken, not helpful."

The in-product disclaimer at `L1502` repeats it to the operator. So the coverage gaps documented below are, in the main, **acknowledged scope limits, not undiscovered bugs** — the findings in §9 separate the genuine defects (silent missing keys, `textContent` markup destruction, write-only settings, no persistence) from the declared scope boundary.

**The entire i18n surface of this 21,857-line file is five identifiers:** `LANG_STRINGS` (`L7903`), `applyLanguage` (`L7939`), `DB.opsConfig.general.language` (`L2570`), and — at the very end of the file — `SETTINGS_GROUPS[].i18nKey` (`L21271–L21276`) with `reorderSettingsTabs()` (`L21278`), which is the only place in the file where JavaScript *creates* a translatable element. There is no `I18N` object, no `TRANSLATIONS`, no `t()` helper, no `currentLang` variable, and no `setLang`/`switchLang`/`toggleLang` function — all confirmed as zero-match greps (§10).

---

## 2. Mechanism / how it works

### 2.1 The single switching function — `applyLanguage(lang)` (`L7939–L7953`)

```js
function applyLanguage(lang){
  var isAr=lang==='ar';
  var sb=document.querySelector('.sb');
  var setNav=document.querySelector('.settings-nav-col');
  document.documentElement.setAttribute('lang',isAr?'ar':'en'); /* lang for accessibility/SEO only — dir stays off <html> on purpose */
  if(sb)sb.setAttribute('dir',isAr?'rtl':'ltr');                /* scoped to the sidebar subtree only, so .main never inherits it */
  if(setNav)setNav.setAttribute('dir',isAr?'rtl':'ltr');        /* same scoped pattern for the Settings page's own sub-nav */
  document.body.classList.toggle('lang-ar',isAr);               /* repositions .sb (and the Settings sub-nav) via flex order */
  document.querySelectorAll('[data-i18n]').forEach(function(el){
    var key=el.getAttribute('data-i18n');
    if(!el.dataset.i18nOriginal)el.dataset.i18nOriginal=el.textContent; /* remember the English source */
    var dict=LANG_STRINGS[lang];
    el.textContent=(isAr&&dict&&dict[key])?dict[key]:el.dataset.i18nOriginal;
  });
}
```

Line-by-line consequences:

| Line | Behaviour | Consequence |
|---|---|---|
| `L7940` | `isAr = lang === 'ar'` | Strictly binary. Any value other than the exact string `'ar'` is treated as English. There is no locale negotiation, no `'ar-SA'` handling, no fallback chain. |
| `L7943` | `documentElement.setAttribute('lang', …)` | Sets `<html lang>` for accessibility/SEO. `dir` is **deliberately never set** on `<html>` or `<body>` — the inline comment says so explicitly. |
| `L7944` | `.sb` gets `dir="rtl"` / `dir="ltr"` | Scoped to the sidebar subtree only. |
| `L7945` | `.settings-nav-col` gets `dir` | Same scoped pattern for the Settings sub-nav. |
| `L7946` | `body.classList.toggle('lang-ar', isAr)` | Pure flexbox repositioning hook; body's own `direction` is untouched. |
| `L7947–L7952` | The translation loop | On first visit to each element, caches its English `textContent` into `el.dataset.i18nOriginal`. Then assigns either the Arabic string or the cached English. |

**Three structural properties of the loop:**

1. **It uses `textContent`, not `innerHTML`.** Any translated element whose English source contains child markup is flattened irreversibly on the first Arabic toggle — the cached "original" is already the flattened text. Two confirmed victims exist in this file (see §9 F3).
2. **There is no English dictionary.** `LANG_STRINGS` has exactly one branch, `ar:` (`L7904–L7937`). English is recovered from the DOM cache, not from data.
3. **It re-queries `document.querySelectorAll('[data-i18n]')` on every call, so it sees the live DOM — which is almost, but not quite, the static HTML shell.** Every *page* in this panel renders by assigning `innerHTML` from concatenated JS strings, and no JS **string literal** anywhere in the file emits a `data-i18n` attribute. But the attribute *is* emitted from JS, by `setAttribute`, in exactly one place: `reorderSettingsTabs()` sets `data-i18n` on the six settings group headers it creates (**`L21296`**) and on the `Other` leftovers header (**`L21307`**). The last `data-i18n` in the file is therefore **`L21307`**, not `L1992`, and the inline script opens at **`L2166`** (not `L2051` — `L2051–L2165` is still static markup). Because `reorderSettingsTabs()` runs once at boot (from `presenceBoot()` `L21393`, registered in `bootModules()` `L21825`) and is never re-run, those six headers are in the DOM before any language switch and **are** translated by this loop. Everything a page renderer produces afterwards is still unreachable, and a re-render after a language switch still wipes whatever the loop had done to it.

### 2.2 Language state and the switching path

| Stage | Line | Detail |
|---|---|---|
| Seed | `L2570` | `general:{…, timezone:'Asia/Riyadh', currency:'SAR', language:'en'}` — an in-memory object literal, recreated on every load. |
| Selector populated | `L7983` (`renderGeneralConfig`, `L7980–L7985`) | `map['cfg-gen-lang']=g.language`, then `el.value=map[id]||''`. |
| User writes | `L7996` (`saveGeneralConfig`) | `g.language = val('cfg-gen-lang') \|\| g.language` |
| Applied | `L7998` | `applyLanguage(g.language)` |
| Audited | `L7999` | `logAction('config_updated','settings','general','General settings updated', before, g)` |
| Confirmed | `L8001` | `toast('✅ General settings saved'+(g.language==='ar'?' — sidebar switched to Arabic':''),'ok')` |
| Boot | `L14596` | `applyLanguage((DB.opsConfig&&DB.opsConfig.general&&DB.opsConfig.general.language)\|\|'en')` — inside the `setTimeout(…,100)` boot block that ends at `L14601`. |

Only **two** call sites of `applyLanguage` exist: `L7998` and `L14596`.

**Persistence: none.** `localStorage`, `sessionStorage`, `setItem`, `getItem`, `indexedDB`, and `document.cookie` all return **zero matches across the entire file** (§10). The language choice lives only in `DB.opsConfig.general.language`, which is re-seeded to `'en'` at `L2570` on every load. Choosing Arabic and saving flips the sidebar immediately, but any refresh, any new tab, and any other person opening the file lands back in English.

### 2.3 The only two other language-aware code paths

Outside `applyLanguage`, exactly two functions read language state — both via `document.body.classList.contains('lang-ar')`:

| Function | Line | What it does in Arabic |
|---|---|---|
| `toggleNotifPanel(e)` | `L2214–L2223` (test at `L2218`) | `p.style.left = isAr?'0':'auto'` (`L2219`), `p.style.right = isAr?'auto':'0'` (`L2220`) — the notification dropdown anchors to the left instead of the right. |
| `ensureToastStack()` | `L5236–L5256` (test at `L5238`) | `L5254` rebuilds the container `cssText` with `(isAr?'left:18px':'right:18px')` and `align-items:'+(isAr?'flex-start':'flex-end')` — the toast stack moves to the bottom-left. The comment at `L5244–L5246` notes the style is recomputed on every call precisely so a mid-session language switch relocates already-queued toasts. |

Every other line of the file is language-blind.

---

## 3. Complete enumerations

### 3.1 `LANG_STRINGS.ar` — the complete dictionary, all 88 keys (`L7903–L7938`)

Object spans `L7903` (`var LANG_STRINGS={`) to `L7938` (`};`); the `ar:` branch is `L7904–L7937`. **There is no `en:` branch.**

| # | Key | Arabic value | Dict line |
|---|---|---|---|
| 1 | `nav.exec-overview` | نظرة عامة | L7905 |
| 2 | `nav.predictive` | الإشارات التنبؤية | L7905 |
| 3 | `nav.fraud` | الاحتيال والمخاطر | L7905 |
| 4 | `nav.dashboard` | لوحة التحكم | L7905 |
| 5 | `nav.live` | الخريطة الحية | L7905 |
| 6 | `nav.subscriptions` | الاشتراكات | L7906 |
| 7 | `nav.corporate` | حسابات الشركات | L7906 |
| 8 | `nav.quickrides` | الرحلات السريعة | L7906 |
| 9 | `nav.trips` | كل الرحلات | L7906 |
| 10 | `nav.renewal` | مسار التجديد | L7907 |
| 11 | `nav.readiness` | جاهزية الرحلات | L7907 |
| 12 | `nav.requests` | الطلبات | L7907 |
| 13 | `nav.drivers` | السائقون | L7907 |
| 14 | `nav.riders` | الركاب | L7907 |
| 15 | `nav.coverage` | التغطية والسعة | L7908 |
| 16 | `nav.compliance` | الامتثال | L7908 |
| 17 | `nav.safety` | السلامة | L7908 |
| 18 | `nav.growth` | العروض والنمو | L7908 |
| 19 | `nav.zones` | المناطق | L7908 |
| 20 | `nav.finance` | المالية | L7909 |
| 21 | `nav.wallets` | محافظ السائقين | L7909 |
| 22 | `nav.rwallets` | محافظ الركاب | L7909 |
| 23 | `nav.support` | مركز الدعم | L7909 |
| 24 | `nav.plans` | خطة التسعير | L7910 |
| 25 | `nav.settings` | الإعدادات | L7910 |
| 26 | `nav.audit-log` | سجل النشاط | L7910 |
| 27 | `nav.contacts` | أسباب التواصل | L7911 |
| 28 | `nav.fairness` | إنصاف الكباتن | L7911 |
| 29 | `nav.commitment` | التزام الباقات | L7911 |
| 30 | `nav.inbox` | صندوق العمل | L7911 |
| 31 | `stab.reasons` | أكواد الأسباب واتفاقية الخدمة | L7911 |
| 32 | `sec.executive` | تنفيذي | L7912 |
| 33 | `sec.intelligence` | الذكاء | L7912 |
| 34 | `sec.overview` | نظرة عامة | L7912 |
| 35 | `sec.operations` | العمليات | L7912 |
| 36 | `sec.fleet` | الأسطول | L7912 |
| 37 | `sec.growth` | النمو | L7913 |
| 38 | `sec.finance` | المالية | L7913 |
| 39 | `sec.support` | الدعم | L7913 |
| 40 | `sec.config` | الإعدادات | L7913 |
| 41 | `stabgrp.workspace` | مساحة العمل | L7914 |
| 42 | `stabgrp.operations` | العمليات | L7914 |
| 43 | `stabgrp.system` | النظام | L7914 |
| 44 | `stabgrp.daily_ops` | العمليات اليومية | L7915 |
| 45 | `stabgrp.money` | المال | L7915 |
| 46 | `stabgrp.people` | الأشخاص والصلاحيات | L7915 |
| 47 | `stabgrp.comms` | تواصل العملاء | L7916 |
| 48 | `stabgrp.platform` | المنصة | L7916 |
| 49 | `stabgrp.records` | السجلات | L7916 |
| 50 | `stabgrp.other` | أخرى | L7916 |
| 51 | `stab.general` | عام | L7917 |
| 52 | `stab.team` | الفريق والأدوار | L7917 |
| 53 | `stab.permissions` | الصلاحيات | L7917 |
| 54 | `stab.dispatch` | المطابقة والتوزيع | L7918 |
| 55 | `stab.cities` | المدن والمناطق | L7918 |
| 56 | `stab.gateways` | بوابات الدفع | L7918 |
| 57 | `stab.limits` | الحدود التشغيلية | L7919 |
| 58 | `stab.cancelpolicy` | سياسة الإلغاء | L7919 |
| 59 | `stab.notifications` | تفضيلات التنبيه | L7919 |
| 60 | `stab.push` | الإشعارات الفورية | L7920 |
| 61 | `stab.emails` | سجل البريد | L7920 |
| 62 | `stab.security` | الأمان | L7920 |
| 63 | `stab.legal` | القانونية والموافقات | L7921 |
| 64 | `stab.activity` | سجل النشاط | L7921 |
| 65 | `stab.export` | تصدير البيانات | L7921 |
| 66 | `gen.title` | عام | L7922 |
| 67 | `gen.desc` | هوية الشركة، مظهر تبويب المتصفح، والإعدادات الإقليمية الافتراضية المستخدمة بكل صفحة وإيصال وإشعار بهذه اللوحة. | L7922 |
| 68 | `gen.brand` | هوية العلامة التجارية | L7923 |
| 69 | `gen.logo_label` | الشعار (يظهر بتبويب المتصفح) | L7923 |
| 70 | `gen.sitename_label` | اسم الشركة / الموقع (عنوان تبويب المتصفح) | L7924 |
| 71 | `gen.sitedesc_label` | وصف الموقع | L7924 |
| 72 | `gen.regional` | الإعدادات الإقليمية الافتراضية | L7925 |
| 73 | `gen.currency_label` | العملة الافتراضية | L7925 |
| 74 | `gen.timezone_label` | المنطقة الزمنية | L7925 |
| 75 | `gen.lang_label` | لغة الواجهة | L7926 |
| 76 | `gen.disclaimer` | ⚠ اختيار العربية يترجم فعليًا القائمة الجانبية وتسميات المجموعات، ويقلب القائمة لاتجاه RTL — جرّبها. باقي اللوحة (الجداول، النماذج، محتوى كل صفحة) يبقى إنجليزي بالكامل حاليًا — ترجمة كل نص مولّد بالملف مشروع أكبر بكثير من مفتاح واحد. | L7927 |
| 77 | `gen.support` | معلومات التواصل للدعم | L7928 |
| 78 | `gen.email_label` | إيميل الدعم | L7928 |
| 79 | `gen.phone_label` | هاتف الدعم | L7928 |
| 80 | `gen.logo_note` | الشعار والعنوان يتحدثان مباشرة بهذا المتصفح فور الرفع/الحفظ. بما إن هذا الملف بدون سيرفر خلفي، إعادة فتح الملف من جديد (أو مشاركته مع شخص آخر) يرجّعه للشعار الافتراضي — ربط تخزين دائم يحتاج سيرفر بسيط. | L7929 |
| 81 | `gen.save_btn` | حفظ الإعدادات العامة | L7930 |
| 82 | `sec.title` | الأمان | L7931 |
| 83 | `sec.desc` | إعدادات الجلسة والوصول لهذه اللوحة. | L7931 |
| 84 | `sec.timeout_label` | تسجيل الخروج التلقائي بعد عدم النشاط (دقائق) | L7932 |
| 85 | `sec.2fa_label` | طلب التحقق بخطوتين لكل أعضاء الفريق | L7933 |
| 86 | `sec.save_btn` | حفظ إعدادات الأمان | L7934 |
| 87 | `sec.planned_title` | قادم قريبًا | L7935 |
| 88 | `sec.planned_desc` | تسجيل دخول SSO/SAML، قائمة عناوين IP المسموحة، وتجاوزات مهلة الجلسة حسب كل دور. | L7936 |

**Dictionary prefix distribution:** `nav.*` 30 · `gen.*` 16 · `sec.*` 16 · `stab.*` 16 · `stabgrp.*` 10 = **88**.

### 3.2 The complete `data-i18n` key inventory in markup — 86 keys

Counts (all verified by grep):

| Metric | Value |
|---|---|
| Lines containing at least one `data-i18n` | 83 |
| Total `data-i18n` occurrences | **86** |
| Unique `data-i18n` keys | **86** |
| Keys used more than once | **0** — every key appears exactly once |
| Lines carrying two attributes | 3 — `L1452`, `L1980`, `L1992` |
| Attribute variants (`data-i18n-placeholder`/`-title`/`-alt`/`-html`/`-value`/`-aria`) | **0 of each** |

**Markup prefix distribution:** `nav.*` 30 · `gen.*` 16 · `sec.*` 16 · `stab.*` 21 · `stabgrp.*` 3 = **86**.

**Grouped by namespace, alphabetically complete:**

**`nav.*` (30)** — `nav.audit-log`, `nav.commitment`, `nav.compliance`, `nav.contacts`, `nav.corporate`, `nav.coverage`, `nav.dashboard`, `nav.drivers`, `nav.exec-overview`, `nav.fairness`, `nav.finance`, `nav.fraud`, `nav.growth`, `nav.inbox`, `nav.live`, `nav.plans`, `nav.predictive`, `nav.quickrides`, `nav.readiness`, `nav.renewal`, `nav.requests`, `nav.riders`, `nav.rwallets`, `nav.safety`, `nav.settings`, `nav.subscriptions`, `nav.support`, `nav.trips`, `nav.wallets`, `nav.zones`

**`sec.*` (16)** — two distinct semantic groups sharing one prefix. Sidebar section labels (9): `sec.config`, `sec.executive`, `sec.finance`, `sec.fleet`, `sec.growth`, `sec.intelligence`, `sec.operations`, `sec.overview`, `sec.support`. Security-settings-panel strings (7): `sec.2fa_label`, `sec.desc`, `sec.planned_desc`, `sec.planned_title`, `sec.save_btn`, `sec.timeout_label`, `sec.title`

**`stab.*` (21)** — `stab.activity`, `stab.branding`, `stab.cancelpolicy`, `stab.cities`, `stab.dispatch`, `stab.emails`, `stab.export`, `stab.gateways`, `stab.general`, `stab.integrity`, `stab.ledger`, `stab.legal`, `stab.limits`, `stab.notifications`, `stab.permissions`, `stab.pricing`, `stab.push`, `stab.reasons`, `stab.rota`, `stab.security`, `stab.team`

**`stabgrp.*` (3 in static markup)** — `stabgrp.operations`, `stabgrp.system`, `stabgrp.workspace`. ⚠ **All three are removed from the DOM at boot** by `reorderSettingsTabs()` (`L21288`); at runtime the rail's group keys are instead the six emitted at `L21296` — `stabgrp.daily_ops`, `.money`, `.people`, `.comms`, `.platform`, `.records`. See §4.2B.

**`gen.*` (16)** — `gen.brand`, `gen.currency_label`, `gen.desc`, `gen.disclaimer`, `gen.email_label`, `gen.lang_label`, `gen.logo_label`, `gen.logo_note`, `gen.phone_label`, `gen.regional`, `gen.save_btn`, `gen.sitedesc_label`, `gen.sitename_label`, `gen.support`, `gen.timezone_label`, `gen.title`

### 3.3 Every `data-i18n` occurrence with line and container

**Sidebar `<aside class="sb">` — 39 occurrences (`L480–L547`):**

| Line | Key | Element |
|---|---|---|
| 486 | `sec.executive` | `div.sb-sec-lbl` |
| 487 | `nav.exec-overview` | `span.sb-lbl` |
| 490 | `sec.intelligence` | `div.sb-sec-lbl` |
| 491 | `nav.predictive` | `span.sb-lbl` |
| 492 | `nav.fraud` | `span.sb-lbl` |
| 495 | `sec.overview` | `div.sb-sec-lbl` |
| 496 | `nav.inbox` | `span.sb-lbl` |
| 497 | `nav.dashboard` | `span.sb-lbl` |
| 498 | `nav.live` | `span.sb-lbl` |
| 501 | `sec.operations` | `div.sb-sec-lbl` |
| 502 | `nav.subscriptions` | `span.sb-lbl` |
| 503 | `nav.corporate` | `span.sb-lbl` |
| 504 | `nav.quickrides` | `span.sb-lbl` |
| 505 | `nav.trips` | `span.sb-lbl` |
| 506 | `nav.renewal` | `span.sb-lbl` |
| 507 | `nav.readiness` | `span.sb-lbl` |
| 508 | `nav.requests` | `span.sb-lbl` |
| 511 | `sec.fleet` | `div.sb-sec-lbl` |
| 512 | `nav.drivers` | `span.sb-lbl` |
| 513 | `nav.riders` | `span.sb-lbl` |
| 514 | `nav.fairness` | `span.sb-lbl` |
| 515 | `nav.commitment` | `span.sb-lbl` |
| 516 | `nav.coverage` | `span.sb-lbl` |
| 517 | `nav.compliance` | `span.sb-lbl` |
| 518 | `nav.safety` | `span.sb-lbl` |
| 521 | `sec.growth` | `div.sb-sec-lbl` |
| 522 | `nav.growth` | `span.sb-lbl` |
| 523 | `nav.zones` | `span.sb-lbl` |
| 526 | `sec.finance` | `div.sb-sec-lbl` |
| 527 | `nav.finance` | `span.sb-lbl` |
| 528 | `nav.wallets` | `span.sb-lbl` |
| 529 | `nav.rwallets` | `span.sb-lbl` |
| 532 | `sec.support` | `div.sb-sec-lbl` |
| 533 | `nav.support` | `span.sb-lbl` |
| 534 | `nav.contacts` | `span.sb-lbl` |
| 537 | `sec.config` | `div.sb-sec-lbl` |
| 538 | `nav.plans` | `span.sb-lbl` |
| 539 | `nav.settings` | `span.sb-lbl` |
| 540 | `nav.audit-log` | `span.sb-lbl` |

(9 `sec.*` section labels + 30 `nav.*` item labels.)

**Settings tab rail `.settings-nav-col` — 24 occurrences (inside `p-settings`):**

| Line | Key | Element |
|---|---|---|
| 1420 | `stabgrp.workspace` | `div.settings-tab-group-lbl` |
| 1421 | `stab.general` | `span` |
| 1422 | `stab.team` | `span` |
| 1423 | `stab.permissions` | `span` |
| 1424 | `stabgrp.operations` | `div.settings-tab-group-lbl` |
| 1425 | `stab.dispatch` | `span` |
| 1426 | `stab.cities` | `span` |
| 1427 | `stab.gateways` | `span` |
| 1428 | `stab.limits` | `span` |
| 1429 | `stab.cancelpolicy` | `span` |
| 1430 | `stab.reasons` | `span` |
| 1431 | `stab.branding` | `span` |
| 1432 | `stab.integrity` | `span` |
| 1433 | `stab.rota` | `span` |
| 1434 | `stab.ledger` | `span` |
| 1435 | `stab.pricing` | `span` |
| 1436 | `stabgrp.system` | `div.settings-tab-group-lbl` |
| 1437 | `stab.notifications` | `span` |
| 1438 | `stab.push` | `span` |
| 1439 | `stab.emails` | `span` |
| 1440 | `stab.security` | `span` |
| 1441 | `stab.legal` | `span` |
| 1442 | `stab.activity` | `span` |
| 1443 | `stab.export` | `span` |

(3 group labels + 21 tab buttons.)

**`#stab-general` panel body — 16 occurrences:**

| Line | Key | Element |
|---|---|---|
| 1452 | `gen.title` | `div.settings-panel-title` |
| 1452 | `gen.desc` | `div.settings-panel-desc` |
| 1455 | `gen.brand` | `div` |
| 1460 | `gen.logo_label` | `label` |
| 1466 | `gen.sitename_label` | `label` |
| 1467 | `gen.sitedesc_label` | `label` |
| 1471 | `gen.regional` | `div` |
| 1473 | `gen.currency_label` | `label` |
| 1484 | `gen.timezone_label` | `label` |
| 1495 | `gen.lang_label` | `label` |
| 1502 | `gen.disclaimer` | `div` (contains `<b>` — see §9 F3) |
| 1504 | `gen.support` | `div` |
| 1506 | `gen.email_label` | `label` |
| 1507 | `gen.phone_label` | `label` |
| 1511 | `gen.logo_note` | `div` |
| 1512 | `gen.save_btn` | `button.btn.p.sm` |

**`#stab-security` panel body — 7 occurrences:**

| Line | Key | Element |
|---|---|---|
| 1980 | `sec.title` | `div.settings-panel-title` |
| 1980 | `sec.desc` | `div.settings-panel-desc` |
| 1983 | `sec.timeout_label` | `label` |
| 1985 | `sec.2fa_label` | `span` |
| 1987 | `sec.save_btn` | `button.btn.p.sm` |
| 1992 | `sec.planned_title` | `div.settings-panel-title` (contains `<span class="settings-soon">` — see §9 F3) |
| 1992 | `sec.planned_desc` | `div.settings-panel-desc` |

### 3.4 The language selector (`L1495–L1500`)

```html
<div class="field" style="max-width:200px"><label data-i18n="gen.lang_label">Interface language</label>
  <select id="cfg-gen-lang">
    <option value="en">English</option>
    <option value="ar">العربية (Arabic)</option>
  </select>
</div>
```

- Two options only: `en` / `ar`.
- **No `onchange` / `oninput` handler.** Changing the dropdown does nothing by itself.
- Committed by the button at `L1512`: `<button class="btn p sm" onclick="saveGeneralConfig()" data-i18n="gen.save_btn">Save general settings</button>`.
- `saveGeneralConfig()` is permission-gated at `L7987` by `requirePerm('manage_settings')` — an operator without that permission **cannot change the interface language at all** (in the seeded data that is only `USR-1`, the Owner).
- `L1498` `العربية (Arabic)` is one of only two Arabic literals in static markup (the other is the plan-name seed at `L1091`).
- There is **no** language toggle in the topbar, no flag icon, no `EN | AR` switcher, no keyboard shortcut. Greps for `lang-toggle` and `langToggle` return 0.

The in-product disclaimer, `L1502`:
> "⚠ Selecting Arabic **really does translate** the sidebar navigation and section labels, and flips the sidebar to RTL — try it. The rest of the panel (tables, forms, every page's own content) stays English-only for now — translating every generated string throughout the file is a much larger project than one toggle can honestly cover."

---

## 4. Matrices

### 4.1 Key × language

The dictionary is single-language, so the matrix has two structural columns rather than two data columns:

| Key set | English source | Arabic source | How English is produced |
|---|---|---|---|
| 81 keys present in both markup and `LANG_STRINGS.ar` | DOM `textContent` at load, cached to `el.dataset.i18nOriginal` on first `applyLanguage` call | `LANG_STRINGS.ar[key]` | Read back from `dataset.i18nOriginal` (`L7951`) — never from a dictionary |
| 5 keys in markup only | same | **missing** | Falls through to `dataset.i18nOriginal`, i.e. stays English silently |
| 7 keys in `LANG_STRINGS.ar` only | n/a | present | Never looked up — dead data |

### 4.2 Markup ∩ dictionary — the exact key mismatch

- Dictionary keys: **88**
- Markup unique keys: **86**
- Intersection: **81**

**(A) In markup but MISSING from the Arabic dictionary — 5 settings tabs that silently stay English even in Arabic mode:**

| Key | Markup line | Panel it labels | Panel line |
|---|---|---|---|
| `stab.branding` | `L1431` | `#stab-branding` | `L1706` |
| `stab.integrity` | `L1432` | `#stab-integrity` | `L1750` |
| `stab.rota` | `L1433` | `#stab-rota` | `L1739` |
| `stab.ledger` | `L1434` | `#stab-ledger` | `L1728` |
| `stab.pricing` | `L1435` | `#stab-pricing` | `L1717` |

Mechanism: `L7951` falls back to `el.dataset.i18nOriginal` whenever `dict[key]` is undefined, so a **missing key is indistinguishable from a deliberately-English element**. No console warning, no visual marker. In Arabic mode these 5 tab labels sit in the middle of an otherwise-Arabic rail, still reading `Branding`, `Data integrity`, `On-call rota`, `Ledger`, `Pricing`.

**(B) In the Arabic dictionary but never used in *static* markup — 7 keys, of which only 1 is a true orphan:**

| Key | Arabic value | Dict line |
|---|---|---|
| `stabgrp.daily_ops` | العمليات اليومية | `L7915` |
| `stabgrp.money` | المال | `L7915` |
| `stabgrp.people` | الأشخاص والصلاحيات | `L7915` |
| `stabgrp.comms` | تواصل العملاء | `L7916` |
| `stabgrp.platform` | المنصة | `L7916` |
| `stabgrp.records` | السجلات | `L7916` |
| `stabgrp.other` | أخرى | `L7916` |

These describe a **6-group settings-tab taxonomy that the markup does not carry but the JavaScript builds at boot**. `SETTINGS_GROUPS` (`L21270–L21277`) declares exactly six groups — `daily_ops`, `money`, `people`, `comms`, `platform`, `records` — each with an `i18nKey`, and `reorderSettingsTabs()` (`L21278–L21313`) creates a `.settings-tab-group-lbl` header per group and stamps `h.setAttribute('data-i18n', g.i18nKey)` at **`L21296`**. It is called from `presenceBoot()` (`L21393`), registered in `bootModules()` at `L21825`.

So **six of the seven are consumed at runtime**, and the true orphan count is **1**: `stabgrp.other` (`L21307`). Its `leftovers` branch (`L21302–L21310`) can only fire if a `[data-tab]` button exists that `SETTINGS_GROUPS` does not name, and the six groups cover all 21 rail tabs (5+4+3+3+4+2 = 21), so it is unreachable in this build.

The inversion runs the other way as well: the **three static** group keys — `stabgrp.workspace` (`L1420`), `stabgrp.operations` (`L1424`), `stabgrp.system` (`L1436`) — are the ones that never render, because `reorderSettingsTabs()` removes every `.settings-tab-group-lbl` from the nav at **`L21288`** (and again at `L21311`) before appending its own. The refactor was **completed in JS**, not abandoned; only the static markup was left behind. *(`03c` L546 already documented `stabgrp.comms` as live at L21274. Correction recorded in `docs/02-verification/corrections-applied.md` Part 2 §6.)*

---

## 5. Coverage analysis / gaps in the matrix

This is the substantive finding of this document.

### 5.1 Headline coverage numbers

| Metric | Value |
|---|---|
| Unique element ids in the static shell (`L1–L2165`) | **485** |
| Unique element ids file-wide | **621** (629 raw `id="` occurrences; the remaining 144 unique ids are emitted by JS builders) |
| Elements carrying a `data-i18n` key (static DOM) | **86** |
| Elements carrying a `data-i18n` key (**at runtime**) | **89** — 86 − 3 removed at `L21288` + 6 injected at `L21296` |
| **Static-markup translation ceiling** | **86 / 485 = 17.7%** |
| Page shells in the file | **41** |
| Page shells containing ≥1 `data-i18n` | **1** (`p-settings`) |
| Page shells containing **0** `data-i18n` | **40** |
| `data-i18n` occurrences inside page shells | 47 (all in `p-settings`) |
| `data-i18n` occurrences outside all page shells | 39 (all in `<aside class="sb">`) |
| `data-i18n` emitted by any JS string builder | **0** |

The 17.7% figure is itself an over-statement of real coverage, because the denominator counts only the **static** shell (`L1–L2165`, 485 unique ids). The overwhelming majority of visible text in this panel is produced at runtime by `innerHTML=` string concatenation, and those 144 further unique ids carry no keys at all. The generalisation that generated markup *never* carries the attribute is **almost** true but not exact: the inline script opens at **`L2166`**, the last static `data-i18n` is at `L1992`, and there are **4** `data-i18n` hits past `L2100` — `L7947` and `L7948` (the loop's own selector and `getAttribute`) and `L21296` / `L21307` (`reorderSettingsTabs()` stamping the six runtime group headers). No `innerHTML` string builder emits the attribute; `setAttribute` does, once, at boot. See §2.1(3).

### 5.2 What actually translates

| UI region | Line range | `data-i18n` count | Translates? |
|---|---|---|---|
| `<aside class="sb">` sidebar | `L480–L547` | **39** | ✅ Yes — 9 section labels + 30 nav item labels |
| Sidebar footer `.sb-ft` | `L543–L546` | 0 | ❌ No — operator name and role stay English/JS-written |
| Topbar `.topbar` | `L552–L580` | **0** | ❌ **No** |
| Settings tab rail `.settings-nav-col` | `L1417–L1444` | **24** | ✅ Yes — except 5 keys missing from the dict (§4.2A) |
| `#stab-general` panel body | `L1448–L1518` | **16** | ✅ Yes |
| `#stab-security` panel body | `L1976–L1994` | **7** | ✅ Yes |
| All 19 other settings panels | `L1519–L2050` | **0** | ❌ No |
| All 40 non-settings page shells | `L583–L1415`, `L2051–L2165` | **0** | ❌ No |
| Modal overlay `#modal-overlay` | `L475` | 0 | ❌ No — every modal is JS-built |
| All JS-generated content | `L2166–EOF` | **6 at runtime** (`L21296`, one per `SETTINGS_GROUPS` entry) | ⚠ Almost none — the settings group headers are the only exception |

**Topbar detail (`L552–L580`) — zero coverage, itemised:**

| Element | Line | Text | Why untranslatable |
|---|---|---|---|
| `#mob-menu-btn` | `L554` | `title="Menu"` | Attribute — no `data-i18n-title` support |
| `#tb-back` | `L557` | `title="Back"` | Attribute |
| `.tb-title#tb-title` | `L560` | `Dashboard` | No key; also overwritten at runtime with the English page name from the `titles` map (`L2168`), so a key would not survive |
| `.tb-sep` | `L561` | `/` | No key (no translation needed) |
| `.tb-sub#tb-sub` | `L562` | `Thursday 25 Jun 2026 · 09:14 AM` | No key; runtime-written from the `subs` map (`L2169`) |
| `#my-work-chip` | `L567` | `✋ 0 mine` + `title="Items you are holding right now"` | No key; runtime-written |
| `#oncall-chip` | `L568` | `📟 —` + `title="Who is on call right now"` | No key; runtime-written |
| `#global-search` | `L571` | `placeholder="Search any ID: RDR / DRV / TRP / SUB…"` | Attribute |
| `#bell-count` | `L575` | `0` | Numeric |
| `#tb-avatar` | `L578` | `SA` | Initials |

### 5.3 `data-i18n` count per page shell — all 41

Boundaries computed as `[own line .. next shell's line − 1]`; the last shell runs to EOF.

| # | Page shell | Start | End | `data-i18n` inside |
|---|---|---|---|---|
| 1 | `p-exec-overview` | 583 | 633 | **0** |
| 2 | `p-corporate` | 634 | 643 | **0** |
| 3 | `p-corp-detail` | 644 | 649 | **0** |
| 4 | `p-fraud` | 650 | 675 | **0** |
| 5 | `p-dashboard` | 676 | 712 | **0** |
| 6 | `p-subscriptions` | 713 | 767 | **0** |
| 7 | `p-live` | 768 | 847 | **0** |
| 8 | `p-trips` | 848 | 860 | **0** |
| 9 | `p-renewal` | 861 | 868 | **0** |
| 10 | `p-readiness` | 869 | 886 | **0** |
| 11 | `p-drivers` | 887 | 906 | **0** |
| 12 | `p-riders` | 907 | 927 | **0** |
| 13 | `p-finance` | 928 | 967 | **0** |
| 14 | `p-wallets` | 968 | 1019 | **0** |
| 15 | `p-rwallets` | 1020 | 1029 | **0** |
| 16 | `p-plans` | 1030 | 1081 | **0** |
| 17 | `p-plan-edit` | 1082 | 1131 | **0** |
| 18 | `p-quickrides` | 1132 | 1150 | **0** |
| 19 | `p-my-account` | 1151 | 1170 | **0** |
| 20 | `p-notifications-all` | 1171 | 1189 | **0** |
| 21 | `p-predictive` | 1190 | 1219 | **0** |
| 22 | `p-coverage` | 1220 | 1235 | **0** |
| 23 | `p-compliance` | 1236 | 1251 | **0** |
| 24 | `p-safety` | 1252 | 1263 | **0** |
| 25 | `p-growth` | 1264 | 1303 | **0** |
| 26 | `p-zones` | 1304 | 1323 | **0** |
| 27 | `p-all-pending` | 1324 | 1341 | **0** |
| 28 | `p-applicant-detail` | 1342 | 1350 | **0** |
| 29 | `p-support` | 1351 | 1379 | **0** |
| 30 | `p-ticket-detail` | 1380 | 1383 | **0** |
| 31 | `p-profile` | 1384 | 1391 | **0** |
| 32 | `p-inbox` | 1392 | 1396 | **0** |
| 33 | `p-commitment` | 1397 | 1401 | **0** |
| 34 | `p-fairness` | 1402 | 1408 | **0** |
| 35 | `p-contacts` | 1409 | 1415 | **0** |
| 36 | **`p-settings`** | 1416 | 2050 | **47** |
| 37 | `p-audit-log` | 2051 | 2067 | **0** |
| 38 | `p-interventions` | 2068 | 2078 | **0** |
| 39 | `p-requests` | 2079 | 2122 | **0** |
| 40 | `p-requests-sub-all` | 2123 | 2143 | **0** |
| 41 | `p-requests-instant-all` | 2144 | EOF | **0** |

### 5.4 Settings panels — tab label vs. panel body

21 settings panels exist (`id="stab-*"`). Only **2** have any translated body content, and **5** have a tab label that cannot translate.

| Panel id | Panel line | Tab label key (line) | Tab label translates? | Panel body translated? |
|---|---|---|---|---|
| `stab-general` | 1448 | `stab.general` (1421) | ✅ | ✅ 16 keys |
| `stab-team` | 1519 | `stab.team` (1422) | ✅ | ❌ 0 |
| `stab-permissions` | 1534 | `stab.permissions` (1423) | ✅ | ❌ 0 |
| `stab-dispatch` | 1552 | `stab.dispatch` (1425) | ✅ | ❌ 0 |
| `stab-cities` | 1622 | `stab.cities` (1426) | ✅ | ❌ 0 |
| `stab-gateways` | 1651 | `stab.gateways` (1427) | ✅ | ❌ 0 |
| `stab-limits` | 1668 | `stab.limits` (1428) | ✅ | ❌ 0 |
| `stab-branding` | 1706 | `stab.branding` (1431) | ❌ **key missing from dict** | ❌ 0 |
| `stab-pricing` | 1717 | `stab.pricing` (1435) | ❌ **key missing from dict** | ❌ 0 |
| `stab-ledger` | 1728 | `stab.ledger` (1434) | ❌ **key missing from dict** | ❌ 0 |
| `stab-rota` | 1739 | `stab.rota` (1433) | ❌ **key missing from dict** | ❌ 0 |
| `stab-integrity` | 1750 | `stab.integrity` (1432) | ❌ **key missing from dict** | ❌ 0 |
| `stab-reasons` | 1771 | `stab.reasons` (1430) | ✅ | ❌ 0 |
| `stab-cancelpolicy` | 1825 | `stab.cancelpolicy` (1429) | ✅ | ❌ 0 |
| `stab-emails` | 1845 | `stab.emails` (1439) | ✅ | ❌ 0 |
| `stab-notifications` | 1907 | `stab.notifications` (1437) | ✅ | ❌ 0 |
| `stab-push` | 1929 | `stab.push` (1438) | ✅ | ❌ 0 |
| `stab-security` | 1976 | `stab.security` (1440) | ✅ | ✅ 7 keys |
| `stab-legal` | 1997 | `stab.legal` (1441) | ✅ | ❌ 0 |
| `stab-activity` | 2008 | `stab.activity` (1442) | ✅ | ❌ 0 |
| `stab-export` | 2020 | `stab.export` (1443) | ✅ | ❌ 0 |

**19 of 21 settings panels have zero translated body content.**

### 5.5 Structurally untranslatable categories

| Category | Why | Examples with lines |
|---|---|---|
| **All JS-generated content except the settings group headers** | No JS **string builder** emits `data-i18n`; the sole JS emitter is `setAttribute` in `reorderSettingsTabs()` (`L21296`, `L21307`), which runs once at boot and is therefore in the DOM before any switch | Every table, card, modal, dropdown, toast and profile in the panel |
| **All `placeholder` attributes** | No `data-i18n-placeholder` support (0 matches) | `L571` `Search any ID: RDR / DRV / TRP / SUB…` |
| **All `title` attributes** | No `data-i18n-title` support (0 matches) | `L481` `Go to dashboard`, `L545` `My account settings`, `L554` `Menu`, `L557` `Back`, `L567` `Items you are holding right now`, `L568` `Who is on call right now` |
| **All `aria-label` / `alt` / `value` attributes** | No variant support (0 matches each) | — |
| **Runtime-written text nodes** | Even a `data-i18n` key would be destroyed by the next `innerHTML`/`textContent` write | `#tb-title` (`L560`), `#tb-sub` (`L562`), `#sb-ft-name`, `#sb-ft-role` |
| **All `toast()` strings** | Built as JS literals at 100+ call sites | Every success/error message in the panel |
| **All `confirm()` dialog text** | Native browser dialogs with literal strings | e.g. `'Log out this session? That device will need to sign in again.'` |
| **All `<option>` labels except the language selector's own** | No keys; the 7 currency options (`L1475–L1481`) and 7 timezone options (`L1486–L1492`) are literal | — |

---

## 6. Actions

| Label | Element / handler | Line | Effect | Permission | Audit |
|---|---|---|---|---|---|
| Interface language `<select>` | `#cfg-gen-lang` | `L1496–L1499` | **Nothing on its own** — no `onchange` handler | — | — |
| **Save general settings** | `onclick="saveGeneralConfig()"` | `L1512` → `L7986` | Writes 7 general fields including `g.language` (`L7996`), calls `applySiteBranding()` (`L7997`) then `applyLanguage(g.language)` (`L7998`), re-renders settings meta (`L8000`), toasts `'✅ General settings saved'` + `' — sidebar switched to Arabic'` when Arabic (`L8001`) | `manage_settings` (`L7987`) | `config_updated` (`L7999`), `entityType:'settings'`, `entityId:'general'`, diff includes `language` |
| *(implicit)* Boot | `applyLanguage(...)` | `L14596` | Applies the seeded `'en'` on every load | — | — |
| *(implicit)* Notification panel open | `toggleNotifPanel(e)` | `L2214` | Anchors the panel left in Arabic (`L2219–L2220`) | — | — |
| *(implicit)* Any toast | `ensureToastStack()` | `L5236` | Anchors the toast stack bottom-left in Arabic (`L5254`) | — | — |

`config_updated` is **not** in `ACTION_LABELS` (see `00c-identity-permissions-and-audit.md` §5.3), so a language change is logged but cannot be filtered for in the Activity Log.

---

## 7. Cross-module dependencies

| Depends on | Where | Nature |
|---|---|---|
| `DB.opsConfig.general` | `L2570` | Holds `language`, plus `currency` and `timezone` (both write-only, §8.2). Read at `L7982`, `L7989`, `L14596`; written at `L7994–L7996`. |
| `requirePerm('manage_settings')` | `L7987` | Gates the only path to changing language. See `00c-identity-permissions-and-audit.md`. |
| `logAction('config_updated', …)` | `L7999` | Language changes are audited alongside the other 6 general fields. |
| `applySiteBranding()` | `L7984`, `L7997` | Called immediately before `applyLanguage` in both `renderGeneralConfig` and `saveGeneralConfig`. |
| `val(id)` helper | `L7990–L7996` | Reads the seven `cfg-gen-*` inputs. |
| `renderSettingsMeta()` | `L8000` | Refreshes the "last saved" stamp. |
| `toast(msg, severity)` | `L8001` | Save confirmation; also the consumer of `ensureToastStack()`'s RTL-aware positioning. |
| `.sb` / `.settings-nav-col` / `body` | `L7941–L7946` | The three DOM handles `applyLanguage` mutates. |
| `.settings-shell` | `L386` | Flex container reversed by `body.lang-ar`. |
| `switchSettingsTab(...)` | `L7314` | Shows/hides `#stab-*` panels — the RTL rules at `L393–L400` only bite on the two panels that are also translated. |
| `validatePlanFeatures()` | `L6050–L6056` | Enforces that both `en` and `ar` text exist on every plan feature bullet. |
| `savePlan()` | `L6117–L6149` | Enforces that both `name` and `nameAr` are non-empty (`L6125`). |
| `rcById(code)` (declared `L14721`) / reason-code renderers | render sites `L14759`, `L15078` | The only two sites in the panel that display Arabic DB content. |

---

## 8. Hardcoded / mock values

### 8.1 Layout and language constants

| Value | Line | Note |
|---|---|---|
| `language:'en'` | `L2570` | Seed default; never persisted, so this is the effective language on every load. |
| `timezone:'Asia/Riyadh'`, `currency:'SAR'` | `L2570` | Seeds for two write-only settings (§8.2). |
| `<html lang="en">` | `L2` | Static; overwritten at runtime by `L7943`. |
| `.sb{width:52px}` | `L24` | Collapsed rail, both languages. |
| `.sb:hover,.sb.pin{width:236px}` | `L30` | Expanded, English. |
| `body.lang-ar .sb:hover,body.lang-ar .sb.pin{width:268px}` | `L31` | Expanded, Arabic — **+32px (+13.6%)** to fit longer Arabic nav labels. |
| `.sb{…width:236px!important…}` (`@media max-width:768px`) | `L429` | Mobile drawer, English. |
| `.sb[dir="rtl"]{…width:268px!important}` (`@media max-width:768px`) | `L435` | Mobile drawer, Arabic. |
| `#DCE0E6` sidebar border colour | `L383` | Literal hex in the RTL rule, not a token. |
| `direction:rtl;text-align:right` inline style | `L1091` | On `#fp3-name-ar` in the plan editor. |
| `direction:rtl;text-align:right` inline style | `L15078` | On the reason-code `labelAr` table cell. |
| `dir="rtl"` inline attribute | `L6015` | On the generated Arabic feature-point input. |

There is **no sidebar *width* custom property.** The `:root` block (`L11–L21`) contains colour tokens only — including `--sb-bg` (`L12`), so the `--sb` prefix is not unused; what does not exist is any `--sb-w` / `--sidebar-width` token. All four sidebar widths are hardcoded literals.

### 8.2 Number / date / currency formatting — none of it is localised

**`Intl` is never touched.** `Intl.`, `NumberFormat`, `DateTimeFormat`, `RelativeTimeFormat`, `PluralRules` — **0 matches each**.

**All 19 `toLocale*` call sites, with their locale argument:**

| # | Line | Call | Locale argument |
|---|---|---|---|
| 1 | `L3137` | `toLocaleTimeString` | `[]` — browser/OS locale |
| 2 | `L3580` | `toLocaleString` | `[]` |
| 3 | `L4728` | `toLocaleDateString` | `'en-GB'` — hardcoded |
| 4 | `L4960` | `toLocaleTimeString` | `[]` |
| 5 | `L6627` | `toLocaleDateString` | `'en-GB'` |
| 6 | `L7553` | `toLocaleString` | `[]` |
| 7 | `L7562` | `toLocaleString` | `[]` |
| 8 | `L7648` | `toLocaleString` | `[]` |
| 9 | `L7742` | `toLocaleString` | `[]` |
| 10 | `L7752` | `toLocaleString` | `[]` |
| 11 | `L7809` | `toLocaleDateString` | `'en-GB'` |
| 12 | `L9150` | `toLocaleTimeString` | `[]` |
| 13 | `L11235` | `toLocaleDateString` | `'en-GB'` |
| 14 | `L11581` | `toLocaleTimeString` | `[]` |
| 15 | `L17726` | `toLocaleTimeString` | `'en-GB'` |
| 16 | `L17735` | `toLocaleTimeString` | `'en-GB'` |
| 17 | `L18755` | `toLocaleDateString` | `'en-GB'` |
| 18 | `L18769` | `toLocaleDateString` | `'en-GB'` |
| 19 | `L19900` | `toLocaleTimeString` | *(no argument)* |

**Tally: `[]` × 10, `'en-GB'` × 8, none × 1. Not one site passes `'ar'`, `'ar-SA'`, or anything derived from `DB.opsConfig.general.language`.**

The `[]` form defers to the *viewer's browser* locale, so the same panel renders different date formats for different operators and never follows the panel's own setting. The `'en-GB'` form is hard-pinned to British English.

**Currency — the single money formatter, `L4394`:**

```js
function fmtSAR(n){return n.toFixed(2)+' SAR';}
```

- Currency code is the **hardcoded literal `' SAR'`**. No `Intl.NumberFormat`, no `style:'currency'`, no parameter.
- **No thousands separators**: `1234567.5` renders `1234567.50 SAR`, never `1,234,567.50`.
- Always suffixed and LTR-ordered — correct for English, not the Arabic convention.
- The riyal glyph (`﷼` U+FDFC, `ر.س`) appears **0 times** in the file.
- **110 occurrences over 93 lines. `L4394` is the definition, so 109 call-site occurrences spread over the 92 call-site lines listed below** (several lines carry more than one) — `L3208`, `L3217`, `L3537`, `L3550`, `L3655`, `L3656`, `L3657`, `L3658`, `L3678`, `L3680`, `L3681`, `L3692`, `L3693`, `L3694`, `L4660`, `L4667`, `L5098`, `L5109`, `L5111`, `L5112`, `L5113`, `L5119`, `L5120`, `L5121`, `L5560`, `L7034`, `L7055`, `L7069`, `L7082`, `L9603`, `L9611`, `L9613`, `L9630`, `L9641`, `L9643`, `L9712`, `L9717`, `L9982`, `L9994`, `L10016`, `L10275`, `L10277`, `L10278`, `L10294`, `L10295`, `L10309`, `L10310`, `L10446`, `L11260`, `L11263`, `L11266`, `L11269`, `L12137`, `L12159`, `L12160`, `L12161`, `L12165`, `L12166`, `L12197`, `L12198`, `L12200`, `L12208`, `L12210`, `L12228`, `L12229`, `L12230`, `L12231`, `L12245`, `L12262`, `L13177`, `L14031`, `L14032`, `L14033`, `L14077`, `L14183`, `L14184`, `L14301`, `L14302`, `L14410`, `L14424`, `L14443`, `L14444`, `L17877`, `L17883`, `L17894`, `L17898`, `L17903`, `L17907`, `L17917`, `L17941`, `L18265`, `L18267`.

**The configured currency is write-only.** The selector offers 7 currencies (`L1474–L1482`): `SAR`, `AED`, `KWD`, `QAR`, `BHD`, `EGP`, `USD`. Every read of `.currency` in the file is: `L7982` (populate its own `<select>`), `L7989` (audit-log snapshot), `L7994` (write). **Nothing ever formats money with it.** Selecting `USD` changes nothing on screen — all 92 `fmtSAR` calls still print ` SAR`.

**The configured timezone is write-only in the same way — in fact more completely so.** The selector offers 7 options (`L1486–L1492`); `DB.opsConfig.general.timezone` is read **only** at `L7982`, `L7989` and `L7995` — all three inside the General-settings form itself. `L19760` does *not* read it: that line concatenates **`DB.onCallSchedule.timezone`**, a separate hardcoded value seeded at `L19599`. **No date anywhere is converted to the configured timezone, and nothing outside its own form ever reads it.**

**`toFixed` is the de-facto number formatter — 248 occurrences across 227 lines.** It is locale-blind by definition: always ASCII digits, always `.` as the decimal separator, never a group separator. Arabic-Indic digits (`٠-٩`, U+0660–U+0669) appear **0 times** in the file.

**Hardcoded English date/number vocabulary:**

| Constant | Line | Value |
|---|---|---|
| `monthNames` | `L4041` | `['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']` |
| `WEEKDAYS` | `L4525` | `['Sun','Mon','Tue','Wed','Thu','Fri','Sat']` |
| `REQ_MONTHS` | `L9556` | `{Jan:0,Feb:1,…,Dec:11}` |
| `mm` | `L9646` | `['Jan','Feb',…,'Dec']` |
| `months` | `L9795` | `['Jan','Feb','Mar','Apr','May','Jun']` |
| `EYVAR_TODAY` | `L11232` | `new Date(2026,5,25)` — the dataset's internal "today" |

`WEEKDAYS` is consumed at `L4595`, `L4723`, `L4746`, `L4859`, `L5100`, `L12308`, `L12392`, and the day arrays are hardcoded again at `L9632`, `L13884`, `L13885`.

### 8.3 Arabic data fields in the DB

Three Arabic-bearing field shapes exist. `titleAr`, `descAr`, `textAr`: **0 matches**.

**(A) `plan.nameAr` — plans (`DB.plans`)**

| Plan | Line | `name` | `nameAr` |
|---|---|---|---|
| `weekly` | `L2890` | Weekly | الباقة الأسبوعية |
| `biweekly` | `L2892` | Bi-weekly | الباقة نصف الشهرية |
| `monthly` | `L2894` | Monthly | الباقة الشهرية |

All 10 `nameAr` sites: `L2890`, `L2892`, `L2894` (seed) · `L6070` `gid('fp3-name-ar').value=p.nameAr||''` (read → its own edit form) · `L6103` `nameAr:''` (new-plan template) · `L6124` read from form · `L6125` **validation — blocks save if empty** · `L6126` audit `before` snapshot · `L6131` write · `L6146` audit `after` snapshot.

**Verdict: zero user-facing render sites.** It is written by the plan editor, read back only into that same editor input, and copied into audit-log diffs. No table, card, list, dropdown, receipt, or export displays it. The plans table and every subscription/pricing string uses `plan.name` (English). The field is **mandatory to save a plan** (`L6125` toasts `'⚠ Both English and Arabic names are required'` and aborts) yet the value the operator is forced to type is never shown to anyone.

**(B) `plan.features[].ar` — bilingual feature bullets**

Seeds: `L2891` (3 bullets), `L2893` (2 bullets), `L2895` (3 bullets). Module default `PLAN_FEATURES` at `L5992–L5995` (3 bullets). All Arabic bullet strings present:

| English | Arabic | Lines |
|---|---|---|
| Same captain every trip | نفس السائق في كل رحلة | `L2891`, `L2893`, `L2895`, `L5993` |
| No waiting at pickup time | بلا انتظار في وقت الالتقاط | `L2891`, `L5994` |
| Save up to 30% vs single rides | وفر حتى 30% مقارنة بالرحلات الفردية | `L2891`, `L5995` |
| Save up to 35% vs single rides | وفر حتى 35% مقارنة بالرحلات الفردية | `L2893` |
| Save up to 40% vs single rides | وفر حتى 40% مقارنة بالرحلات الفردية | `L2895` |
| Priority support | دعم ذو أولوية | `L2895` |

Sites: `L6006` `arLong=(f.ar||'').length>60` (length check) · `L6015` `value="…" dir="rtl"` (read → its own input) · `L6016` `oninput="PLAN_FEATURES[i].ar=this.value"` (write) · `L6018` Arabic char-count warning `f.ar.length+' حرف — قد يلتف على الجوال'` · `L6031` `push({en:'',ar:''})` · `L6053` **validation — both languages required** · `L6094` copy in · `L6142` copy out.

**Verdict: zero user-facing render sites.** Same pattern as `nameAr` — mandatory to save (`L6053`), round-trips through its own editor, never displayed.

**(C) `reasonCode.labelAr` — the one Arabic field that IS read**

40 seeded reason codes at `L14669–L14715` (`grep -c "{code:'"` over that range → **40**; `12c`, `13a`, `13c`, `13d` and `15k` all agree on 40), each with `labelEn` and `labelAr`. Two read sites:

| Line | Site | Behaviour |
|---|---|---|
| `L14759` | `label:(r.ref?'§'+r.ref+'  ':'')+r.labelEn+(r.labelAr?'  —  '+r.labelAr:'')+'  ·  '+r.cat` | Reason-code dropdown option label — English and Arabic concatenated on one line |
| `L15078` | `'<td style="font-size:11px;direction:rtl;text-align:right">'+(r.labelAr\|\|'—')+'</td>'` | A dedicated table column in the Reason Codes settings tab |

**Both render unconditionally — in English mode too.** This is the only Arabic content in the entire panel that displays without switching language, and `L15078` is the only inline `direction:rtl` outside the sidebar/settings shell.

`L15121` — new reason codes created through the UI are written as `{…labelEn:label.trim(), labelAr:'', active:true}`. **Any reason code an operator adds has a permanently blank Arabic label, and the UI provides no field to fill it in.**

**(D) Complete inventory of Arabic-script literals in the file — 86 lines, grouped**

| Owner | Lines | Count |
|---|---|---|
| `REASON_CODES` seed — `labelAr` | `L14669`–`L14715` (47 records over 40 lines) | 40 |
| `LANG_STRINGS.ar` dictionary values | `L7905`–`L7936` | 32 |
| `DB.plans` seed — `nameAr` + `features[].ar` | `L2890`, `L2891`, `L2892`, `L2893`, `L2894`, `L2895` | 6 |
| `PLAN_FEATURES` module default — `.ar` | `L5993`, `L5994`, `L5995` | 3 |
| Plan-feature editor `innerHTML` — Arabic placeholder `نقطة الميزة (AR)` + char-count warning | `L6015`, `L6018` | 2 |
| `#p-plan-edit` markup — `<input id="fp3-name-ar">` seeded `الباقة الأسبوعية` | `L1091` | 1 |
| `#p-settings` markup — `<option value="ar">العربية (Arabic)</option>` | `L1498` | 1 |
| `simulateWhatsApp()` — a hardcoded Arabic inbound message body | `L20376` | 1 |
| **Total** | | **86** |

**Read-site tally:**

| Field | Definition / write sites | Round-trip-to-own-form sites | **User-facing render sites** |
|---|---|---|---|
| `plan.nameAr` | 5 | 3 | **0** |
| `plan.features[].ar` | 6 | 4 | **0** |
| `reasonCode.labelAr` | **41** (40 seed rows `L14669–L14715` + 1 runtime write `L15121`) | 0 | **2** (`L14759`, `L15078`) |

---

## 9. Risks & findings

**F1 — Coverage is 17.7% of the static shell and effectively ~0% of the running application.** 86 of the 485 unique-id elements in the static shell carry a key (89 elements carry one at runtime, after `reorderSettingsTabs()` removes 3 and injects 6); 40 of 41 page shells carry none; no JS string builder emits the attribute, and the single `setAttribute` emitter (`L21296`) covers only the settings group headers. The panel's own disclaimer (`L1502`) declares this scope, so it is a documented limit rather than a defect — but the practical consequence is that an Arabic operator sees an Arabic left rail attached to a wholly English application. See §5.

**F2 — Five settings tabs silently stay English in Arabic mode.** `stab.branding` (`L1431`), `stab.integrity` (`L1432`), `stab.rota` (`L1433`), `stab.ledger` (`L1434`), `stab.pricing` (`L1435`) are used in markup but missing from `LANG_STRINGS.ar`. Because `L7951` falls back to `dataset.i18nOriginal` when `dict[key]` is undefined, a missing key is **indistinguishable from a deliberately-untranslated one** — no console warning, no visual marker. This is a real defect, not a scope limit: the tabs sit mid-rail among translated neighbours. All five label settings panels that sit late in the rail. `UNVERIFIED:` whether they were added *after* the original translation pass is not recoverable from a single-file snapshot — there is no VCS history and no dated comment — so the "silent drift as new tabs are added" reading is a plausible explanation, not an established one.

**F3 — `applyLanguage` uses `textContent`, destroying inline markup irreversibly.** `L7951` assigns `el.textContent`, and `L7949` caches `el.textContent` as the "English original". Any translated element containing child markup is flattened on the **first** Arabic toggle and can never be restored, because the cache captured the already-flattened text. Two confirmed victims in this file:
- `L1992` `sec.planned_title` — English source is `Planned <span class="settings-soon">Coming soon</span>`. After one Arabic toggle, English mode renders the flattened string `Planned Coming soon` and the "Coming soon" badge is gone permanently.
- `L1502` `gen.disclaimer` — contains `<b>really does translate</b>`. The bold is lost after one toggle. The element that explains the translation feature is itself broken by the translation feature.

**F4 — Language is never persisted.** `localStorage`, `sessionStorage`, `setItem`, `getItem`, `indexedDB`, `document.cookie`: **0 matches in the entire file.** Choosing Arabic and saving flips the sidebar immediately, but any refresh, any new tab, and any other person opening the file lands back in English (`L2570` re-seeds `'en'`, `L14596` applies it). The UI acknowledges this limitation for the **logo** (`gen.logo_note`, `L1511`: *"Since this file has no backend server, re-opening the file fresh … resets to the default logo"*) but **never mentions that the same applies to language.** An operator reading the disclaimers has no reason to expect their language choice to evaporate.

**F5 — One orphan dictionary key, not seven; the refactor was completed in JavaScript.** `stabgrp.daily_ops`, `stabgrp.money`, `stabgrp.people`, `stabgrp.comms`, `stabgrp.platform` and `stabgrp.records` (`L7915–L7916`) are **live**: `SETTINGS_GROUPS` (`L21270–L21277`) attaches each to a group header that `reorderSettingsTabs()` creates and stamps with `data-i18n` at `L21296`, on boot via `presenceBoot()` `L21393` / `bootModules()` `L21825`. The rendered rail has **6** groups, not 3. The single true orphan is **`stabgrp.other`** (`L7916`, emitted at `L21307`), whose `leftovers` branch is unreachable because the six groups cover all 21 tabs. Conversely the three *static* keys (`L1420`, `L1424`, `L1436`) are removed from the DOM at boot (`L21288`) and are the ones that never render. See §4.2B.

**F6 — There is no language toggle anywhere in the chrome.** The only path is Sidebar → Settings → General → *Interface language* → press **Save general settings**. Changing the `<select>` alone does nothing (`L1496` has no `onchange`). Worse, the whole path is gated by `requirePerm('manage_settings')` (`L7987`) — in the seeded data only `USR-1` holds it, so **4 of 5 operators cannot change the interface language at all**, and the failure surfaces only after they fill in the form and press Save.

**F7 — No attribute is translatable.** Zero support for `data-i18n-placeholder`, `-title`, `-alt`, `-html`, `-value`, `-aria`. Every tooltip, placeholder, and accessible name stays English forever — including the global search placeholder (`L571`) and every icon-button `title` (`L481`, `L545`, `L554`, `L557`, `L567`, `L568`). For a screen-reader user in Arabic mode, `<html lang="ar">` (`L7943`) tells the AT to read English `title` and `placeholder` text with Arabic phonology.

**F8 — `<html>` has `lang` but never `dir`.** `L7943` sets `lang` and the inline comment states `dir` is off `<html>` "on purpose". The rationale (`L370–L381`) is sound for visual layout, but the accessibility consequence is unaddressed: assistive technology is told the document is Arabic while the document's base direction remains LTR, and the 40 untranslated pages are English content announced under an `ar` language tag.

**F9 — The RTL implementation uses two parallel hooks for the same idea.** Desktop sidebar width keys off `body.lang-ar` (`L31`); mobile drawer width keys off `.sb[dir="rtl"]` (`L435`). Both are set by `applyLanguage`, so they stay in sync today, but they are two mechanisms for one concept — a future change touching only one leaves the other stale.

**F10 — Arabic plan data is mandatory to enter and impossible to see.** `savePlan` refuses to save without `nameAr` (`L6125`) and `validatePlanFeatures` refuses without every `features[].ar` (`L6053`), yet **neither field has a single user-facing render site**. Operators are compelled to produce translations that no screen in the panel — English or Arabic — will ever display.

**F11 — Arabic reason-code labels render in English mode.** `L14759` concatenates `labelEn + '  —  ' + labelAr` into every reason-code dropdown option, and `L15078` gives `labelAr` its own always-visible table column. Both are unconditional. An English-only operator sees Arabic text in a dropdown they cannot read, while the Arabic-mode operator sees an otherwise entirely English screen.

**F12 — Reason codes created through the UI have permanently blank Arabic labels.** `L15121` writes `labelAr:''`, and the add-reason-code form offers no Arabic input. The `L15078` column renders `'—'` for them, and `L14759` omits the Arabic half. The 40 seeded codes are bilingual; every code added thereafter is not, with no path to fix it in-product.

**F13 — Nothing in the panel is number-, date-, or currency-localised.** `Intl` is never used. Money is `n.toFixed(2)+' SAR'` (`L4394`) at 92 call sites — no separators, no symbol, no locale. Dates split between `'en-GB'` (8 sites) and the *viewer's browser* locale via `[]` (10 sites), so the same panel shows different date formats to different operators and never follows its own language setting. `toFixed` (248 occurrences) is locale-blind by definition. Arabic-Indic digits appear 0 times.

**F14 — The currency and timezone settings are write-only.** 7 currency options (`L1475–L1481`) and 7 timezone options (`L1486–L1492`) can be selected, saved, and audited — and change nothing. `.currency` is read only to repopulate its own `<select>` (`L7982`) and to snapshot the audit diff (`L7989`); `.timezone` has **no** reader outside its own form at all — `L19760` reads the unrelated `DB.onCallSchedule.timezone` (seeded `L19599`), not this setting. Selecting `USD` still prints ` SAR` everywhere; selecting `Europe/London` converts no date. These are settings that appear to work, are logged as changed, and have no effect — a stronger failure than a missing feature.

**F15 — `config_updated` is not in `ACTION_LABELS`.** The language change is audited at `L7999` under the key `config_updated`, which is the single highest-volume audit key in the file (40 call sites) and is absent from the 26-entry `ACTION_LABELS` map. It therefore cannot be selected in the Activity Log's action-type filter. See `00c-identity-permissions-and-audit.md` §5.3.

**F16 — Arabic widens the sidebar by 32px with no corresponding main-area adjustment.** `L31` takes the expanded rail from 236px to 268px. `.main` has no width rule keyed on `body.lang-ar`; it relies on flex to absorb the difference. On a narrow desktop viewport the Arabic rail eats 32px more of the content area than the English one, and no page's table layout accounts for that.

**F17 — RTL never reaches page content, by design, leaving a hybrid layout.** `.main` and all 41 page shells never receive `dir` or `direction` (`L370–L381` documents this as intentional). In Arabic mode the result is a right-hand RTL sidebar bolted to a full LTR English body. This is the least-bad option given F1, but it means the Arabic mode is not a usable Arabic interface — it is an Arabic navigation label set.

**F18 — `#stab-general` and `#stab-security` inputs are force-flipped back to LTR.** `L396` sets `direction:ltr;text-align:right` on **`input,select`** inside `#stab-general`; `L400` sets it on **`input` only** inside `#stab-security` — which is harmless today because `#stab-security` contains no `<select>`, but the rule is half-scoped. Correct for the email, phone, and numeric fields those panels contain, but it is a blanket rule — any future Arabic-text field added to either panel inherits LTR silently.

---

## 10. UNVERIFIED items

| Item | Reason |
|---|---|
| Whether the two `stab.*` keys `stab.reasons` (dict `L7911`) and its markup use (`L1430`) were intended to live with the `nav.*` block | `stab.reasons` is defined on `L7911` inside the `nav.*` run rather than with the other `stab.*` keys at `L7917–L7921`. Functionally irrelevant (object key order does not matter), but the placement suggests it was appended hastily. Intent is not recoverable from the file. |
| Whether `L20376` (`simulateWhatsApp()`) Arabic message body is ever rendered to screen | The line was identified as containing Arabic script inside a simulation function. Whether the simulated inbound message reaches a visible surface was not traced. |
| The exact rendered output of every `toLocale*` call with `[]` | `[]` defers to the viewer's browser/OS locale, which differs per environment. Formats cannot be stated without executing in a known locale. |
| Whether the 4 duplicated `id` strings distort the coverage denominator materially | 629 raw `id="` occurrences vs 621 distinct strings. Two of the four (`cfa-'+f.id+'` at `L17774`/`L17781`/`L17783`, `docexp-card-'+a.id+'` at `L11010`/`L11016`) are JS concatenation templates that expand to distinct ids at runtime; two (`fc-detail` at `L15530`/`L15554`/`L15577`, `nt-sub` at `L2425`/`L2547`/`L15316`/`L16449`) are genuine repeated literals inside `innerHTML` builders that are never mounted simultaneously. The coverage ratio is unaffected either way. (Note the denominator has since been corrected: the static shell `L1–L2165` holds **485** unique ids, not 621 — 621 is the file-wide figure — so the static ceiling is **86/485 ≈ 17.7%**. See §5.1.) |
| Whether any browser's `textContent` behaviour on `L7949` differs for elements with mixed text/element children | The flattening described in F3 follows from the DOM spec and was reasoned from the code, not executed. |
| Total count of *visible strings* in the running application (the true i18n denominator) | Would require enumerating every literal inside every `innerHTML` builder across ~19,000 lines of JS. The 485-element static-shell denominator (621 file-wide) is a lower bound on the problem, not a measure of it. |
| Whether `applySiteBranding()` (`L7984`, `L7997`) contains any language-dependent behaviour | Not inspected; it is called adjacent to `applyLanguage` in both call paths but its body was not traced. |

---

## 11. Line-number index

| Symbol / element | Line |
|---|---|
| `<html lang="en">` | `L2` |
| `:root` colour tokens (no width tokens) | `L11–L21` |
| `.sb{width:52px…}` | `L24` |
| `.sb:hover,.sb.pin{width:236px}` | `L30` |
| `body.lang-ar .sb:hover,body.lang-ar .sb.pin{width:268px}` | `L31` |
| RTL rationale comment | `L370–L381` |
| `body.lang-ar{flex-direction:row-reverse}` | `L382` |
| `.sb[dir="rtl"]{border-right:none;border-left:…}` | `L383` |
| `.sb[dir="rtl"] .sb-lbl,.sb[dir="rtl"] .sb-sec-lbl{text-align:right}` | `L384` |
| `.sb[dir="rtl"] .sb-badge{margin-left:0;margin-right:auto}` | `L385` |
| `body.lang-ar .settings-shell{flex-direction:row-reverse}` | `L386` |
| Content-level RTL rationale comment | `L387–L392` |
| `body.lang-ar #stab-general{direction:rtl}` | `L393` |
| `#stab-general` label/`[data-i18n]` right-align | `L394` |
| `#stab-general .settings-panel-head{text-align:right}` | `L395` |
| `#stab-general input,select{direction:ltr;text-align:right}` | `L396` |
| `body.lang-ar #stab-security{direction:rtl}` | `L397` |
| `#stab-security` label/`[data-i18n]` right-align | `L398` |
| `#stab-security .settings-panel-head{text-align:right}` | `L399` |
| `#stab-security input{direction:ltr;text-align:right}` | `L400` |
| `.settings-nav-col[dir="rtl"] .settings-tab{text-align:right}` | `L401` |
| `.settings-nav-col[dir="rtl"] .settings-tab-group-lbl{text-align:right}` | `L402` |
| `@media (max-width:768px)` block start | `L424` |
| Mobile `.sb{…width:236px!important…}` | `L429` |
| Mobile `.sb[dir="rtl"]{left:auto;right:0;…width:268px!important}` | `L435` |
| Mobile `.sb[dir="rtl"].mob-open` | `L436` |
| `<body>` | `L472` |
| `<aside class="sb">` | `L480` |
| First `data-i18n` (`sec.executive`) | `L486` |
| Last sidebar `data-i18n` (`nav.audit-log`) | `L540` |
| Sidebar footer `.sb-ft` (0 keys) | `L543` |
| `</aside>` | `L547` |
| `.topbar` start (0 keys) | `L552` |
| `#tb-title` | `L560` |
| `#tb-sub` | `L562` |
| `#global-search` placeholder | `L571` |
| `.topbar` end | `L580` |
| First page shell `p-exec-overview` | `L583` |
| `#fp3-name-ar` seeded Arabic plan name | `L1091` |
| `p-settings` shell start | `L1416` |
| `.settings-nav-col` first key (`stabgrp.workspace`) | `L1420` |
| Settings rail last key (`stab.export`) | `L1443` |
| `#stab-general` panel start | `L1448` |
| `gen.title` + `gen.desc` (2 attrs on one line) | `L1452` |
| Currency `<select id="cfg-gen-currency">` + 7 options | `L1474–L1482` |
| Timezone `<select id="cfg-gen-tz">` (`L1485`) + 7 options (`L1486–L1492`) | `L1485–L1493` |
| `gen.lang_label` label | `L1495` |
| `<select id="cfg-gen-lang">` | `L1496` |
| `<option value="en">English</option>` | `L1497` |
| `<option value="ar">العربية (Arabic)</option>` | `L1498` |
| `gen.disclaimer` (contains `<b>`) | `L1502` |
| `gen.logo_note` (backend-persistence disclaimer) | `L1511` |
| `gen.save_btn` → `saveGeneralConfig()` | `L1512` |
| `#stab-team` | `L1519` |
| `#stab-permissions` | `L1534` |
| `#stab-dispatch` | `L1552` |
| `#stab-cities` | `L1622` |
| `#stab-gateways` | `L1651` |
| `#stab-limits` | `L1668` |
| `#stab-branding` (tab key missing from dict) | `L1706` |
| `#stab-pricing` (tab key missing from dict) | `L1717` |
| `#stab-ledger` (tab key missing from dict) | `L1728` |
| `#stab-rota` (tab key missing from dict) | `L1739` |
| `#stab-integrity` (tab key missing from dict) | `L1750` |
| `#stab-reasons` | `L1771` |
| `#stab-cancelpolicy` | `L1825` |
| `#stab-emails` | `L1845` |
| `#stab-notifications` | `L1907` |
| `#stab-push` | `L1929` |
| `#stab-security` panel start | `L1976` |
| `sec.title` + `sec.desc` (2 attrs) | `L1980` |
| `sec.planned_title` + `sec.planned_desc` (2 attrs; contains `<span>`) | `L1992` |
| **Last `data-i18n` in the entire file** | `L1992` |
| `#stab-legal` | `L1997` |
| `#stab-activity` | `L2008` |
| `#stab-export` | `L2020` |
| `p-settings` shell end | `L2050` |
| `toggleNotifPanel(e)` | `L2214–L2223` |
| `isAr` test in `toggleNotifPanel` | `L2218` |
| `DB.opsConfig.general` seed (`language:'en'`, `currency:'SAR'`, `timezone:'Asia/Riyadh'`) | `L2570` |
| `DB.plans.weekly` (`nameAr`) | `L2890` |
| `weekly.features[]` (`.ar`) | `L2891` |
| `DB.plans.biweekly` (`nameAr`) | `L2892` |
| `biweekly.features[]` (`.ar`) | `L2893` |
| `DB.plans.monthly` (`nameAr`) | `L2894` |
| `monthly.features[]` (`.ar`) | `L2895` |
| `logAction` `ts` via `toLocaleTimeString([])` | `L3137` |
| `monthNames` | `L4041` |
| `fmtSAR(n)` — the only money formatter | `L4394` |
| `WEEKDAYS` | `L4525` |
| `ensureToastStack()` | `L5236–L5256` |
| `isAr` test in `ensureToastStack` | `L5238` |
| RTL-aware toast positioning | `L5254` |
| `PLAN_FEATURES` module default (Arabic bullets) | `L5992–L5995` |
| Feature-length check reading `f.ar` | `L6006` |
| Generated Arabic feature input (`dir="rtl"`) | `L6015` |
| `oninput` writing `PLAN_FEATURES[i].ar` | `L6016` |
| Arabic char-count warning string | `L6018` |
| `PLAN_FEATURES.push({en:'',ar:''})` | `L6031` |
| `validatePlanFeatures()` (Arabic mandatory) | `L6050–L6058` |
| `loadPlanEditForm()` reading `p.nameAr` | `L6070` |
| `newPlan()` template `nameAr:''` | `L6103` |
| `savePlan()` start | `L6118` |
| `nameAr` read from form | `L6124` |
| **`nameAr` mandatory-validation** | `L6125` |
| `savePlan` audit `before` snapshot | `L6126` |
| `p.nameAr=nameAr` write | `L6131` |
| `p.features` write-back | `L6142` |
| `save_plan` audit call | `L6146` |
| `switchSettingsTab(...)` | `L7314` |
| Localization design comment | `L7897–L7902` |
| **`var LANG_STRINGS={`** | `L7903` |
| `ar:{` branch start | `L7904` |
| `nav.*` values | `L7905–L7911` |
| `sec.*` sidebar values | `L7912–L7913` |
| `stabgrp.*` values (3 used, 7 orphaned) | `L7914–L7916` |
| `stab.*` values | `L7917–L7921` |
| `gen.*` values | `L7922–L7930` |
| `sec.*` security-panel values | `L7931–L7936` |
| `ar:` branch end | `L7937` |
| `};` dictionary end | `L7938` |
| **`function applyLanguage(lang)`** | `L7939` |
| `isAr=lang==='ar'` | `L7940` |
| `<html lang>` set (`dir` deliberately not set) | `L7943` |
| `.sb` `dir` set | `L7944` |
| `.settings-nav-col` `dir` set | `L7945` |
| `body.lang-ar` toggle | `L7946` |
| `querySelectorAll('[data-i18n]')` loop | `L7947` |
| `dataset.i18nOriginal` cache | `L7949` |
| **`el.textContent=` assignment (markup-destroying)** | `L7951` |
| `applyLanguage` end | `L7953` |
| `renderGeneralConfig()` | `L7980–L7985` |
| `saveGeneralConfig()` | `L7986` |
| `requirePerm('manage_settings')` gate | `L7987` |
| `before` snapshot incl. `language` | `L7989` |
| `g.currency=` write | `L7994` |
| `g.timezone=` write | `L7995` |
| `g.language=` write | `L7996` |
| `applySiteBranding()` | `L7997` |
| **`applyLanguage(g.language)`** | `L7998` |
| `logAction('config_updated', …)` | `L7999` |
| Arabic-aware save toast | `L8001` |
| `REQ_MONTHS` | `L9556` |
| `mm` month array | `L9646` |
| `months` array | `L9795` |
| `EYVAR_TODAY` | `L11232` |
| **Boot `applyLanguage(...)`** | `L14596` |
| `REASON_CODES` seed start (`labelAr`) | `L14669` |
| `REASON_CODES` seed end | `L14715` |
| **`labelAr` read — dropdown option label** | `L14759` |
| **`labelAr` read — table column with `direction:rtl`** | `L15078` |
| New reason code written with `labelAr:''` | `L15121` |
| `DB.onCallSchedule.timezone` (a *different* value, seeded `L19599`) concatenated into a static sentence — **not** `DB.opsConfig.general.timezone` | `L19760` |
| Arabic inbound message in `simulateWhatsApp()` | `L20376` |
