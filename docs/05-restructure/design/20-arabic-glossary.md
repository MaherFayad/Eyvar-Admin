# 20 — The Arabic glossary, and the §9.6 rulings ratified

**Status:** ratified. Supersedes nothing; it *completes* `DESIGN.md` §9.6, which made the
rulings and gave no worked examples, and `18-pwa-arabic-and-voice.md` §2.3 step 2, which
asked for this list and sized it at ~120 terms. It lands at **146**.

**Who this is for.** A translator, and the reviewer of a translator's work. It is not an
engineering document — the engineering is in [`docs/ref/i18n.md`](../../ref/i18n.md) and
[`docs/08-i18n/KEYS.md`](../../08-i18n/KEYS.md).

**Why it comes first.** `18` §2.3: *"Decide these once with the business, before the bulk
work, or the same noun gets three renderings across three screens and the console reads as
three products."* There are **4,461 keys** to translate. At three renderings of `captain`
across three workspaces, an operator moving from Live Dispatch to Fairness to the ledger is
reading three different products about the same person.

**Where the terms came from.** Measured, not imagined: a word-frequency pass over all 29
`copy.ts` files plus `src/i18n/dictionaries.ts`, the 47 `reason.*` labels in
`src/i18n/vocabulary/copy.ts`, and the domain types in `src/data/types/`. Every English
term below appears in shipped copy. `captain` occurs 133 times, `rider` 71, `trip` 84,
`subscription` 74, `escrow` 17, `halala` in every money formatter.

---

## Part 1 — The §9.6 rulings, ratified

§9.6 made six rulings and shipped none of them with an example. Each is **RATIFIED
unchanged** below, with the mechanical consequence spelled out, because a rule a translator
cannot apply to the string in front of them is a rule that will be broken.

| # | Ruling | Status | What it means at the keyboard |
|---|---|---|---|
| R1 | **Punctuation is Arabic.** `،` U+060C for comma, `؛` U+061B for semicolon, `؟` U+061F for question mark | RATIFIED | A Latin `,` in an Arabic string is a defect, not a preference. `.` U+002E stays — Arabic has no separate full stop. `:` and `%` stay |
| R2 | **The terminal period is the last character of the source string** | RATIFIED | Never `'{count} رحلة. '` and never a period placed before a trailing `{value}`. The bidi algorithm moves a trailing neutral to the visually wrong end of the line, so the period lands at the *left* of an Arabic sentence |
| R3 | **MSA, one register.** No dialect, no code-switching | RATIFIED | An operator in Riyadh and an operator in Jeddah read the same console. Colloquial constructions in long explanatory strings are normalised, not preserved |
| R4 | **Latin proper nouns keep English capitalisation and are `<bdi>`-isolated** | RATIFIED | `Eyvar`, `SAR`, `RDR-4821`, `SLA`, `VAT`, `IBAN`, a plate, a captain's Latin-script name. See Part 5 |
| R5 | **No `text-transform`, no `letter-spacing`** | RATIFIED | Arabic has no letter case, and letter-spacing breaks the joins between letters in a cursive script. Restates §9.4 |
| R6 | **Buttons are masdar (verbal noun), never imperative** | RATIFIED | Part 2, with 22 worked examples. This is the ruling that had none |
| R7 | **Six CLDR plural categories, through the selector** | RATIFIED | `zero` `one` `two` `few` `many` `other`. Arabic marks exactly-two grammatically (`رحلتان`), so an English string handling 1 and n is *wrong at 2*. `src/lib/i18n/plural.ts` already holds the table — never hand-roll a count branch |
| R8 | **Western digits `0`–`9`** | RATIFIED | The Saudi digital convention (§9.2). The locale is pinned `ar-SA-u-ca-gregory-nu-latn` so `Intl` cannot produce Arabic-Indic digits or a Hijri date by accident |

### One refinement R7 needs and §9.6 does not state

**Gender agreement forbids a generic `{entity}` in a verbal sentence.** §9.6 observes that
`{entity} تم تحديثه` breaks when `{entity}` is feminine. The consequence for the translator
is a *key-shape* decision, not a wording one: a sentence whose verb or adjective agrees with
an interpolated noun **must be split into one key per noun**, not one key with a parameter.

- Wrong: `'تم تحديث {entity}.'` — correct for رحلة, wrong for اشتراك.
- Right: `'trip.updated'` and `'subscription.updated'` as separate keys.

Raise it rather than guess. Adding a key is a two-line change in a `copy.ts`; a sentence
that is ungrammatical for half the nouns in the product is not fixable in the dictionary.

---

## Part 2 — The masdar convention, worked

**The ruling (§9.6):** *"MUST write Arabic button labels as masdar (verbal-noun) forms …
MUST NOT mix masdar and imperative forms within the product."* The shipping dictionary
already uses it (`حفظ الإعدادات العامة`), which is why masdar won and not imperative.

**Why it is not cosmetic.** English button copy is verb-first and imperative — `Save`,
`Waive`, `Escalate` — so the natural Arabic reflex is the imperative `احفظ`, `أسقِط`,
`صعِّد`. That reads as the console *ordering the operator about*. The masdar names the
action instead of commanding it, which is the register a professional tool wants and the one
every Arabic OS uses. Mixing the two inside one product is the actual defect: two buttons
side by side, one commanding and one naming, reads as a translation error even to someone
who cannot say why.

### The 22 verbs, all drawn from shipped button labels

| English label | Imperative — **rejected** | **Masdar — ships** | Note |
|---|---|---|---|
| Save | احفظ | **حفظ** | The precedent (`:7930`) |
| Cancel | ألغِ | **إلغاء** | §5.7's permitted non-verb label |
| Close | أغلِق | **إغلاق** | |
| Apply | طبِّق | **تطبيق** | Filters, a policy |
| Assign / Dispatch captain | أسنِد | **إسناد** | `dispatch.assignCaptain` |
| Reassign | أعِد الإسناد | **إعادة الإسناد** | `sub.confirmChange` |
| Release | أفرِج | **إفراج** | Escrow. `إفراج` not `إطلاق` — the money is *held*, not *launched* |
| Hold | احجز | **حجز** | The counterpart of إفراج |
| Waive | أسقِط | **إسقاط** | A strike, a fee. Not `تنازل` — the operator is not renouncing a right of their own |
| Resolve | احسِم | **حلّ** | A ticket, a dispute |
| Escalate | صعِّد | **تصعيد** | |
| Uphold | أيِّد | **تأييد** | A disputed decision stands |
| Overturn | انقُض | **نقض** | The paired opposite of تأييد. Keep the pair; do not translate one as إلغاء |
| Approve | وافِق | **موافقة** | An application, a payout |
| Reject | ارفُض | **رفض** | |
| Suspend | أوقِف | **إيقاف** | A captain, surge |
| Freeze | جمِّد | **تجميد** | A subscription. Distinct from إيقاف — a freeze resumes |
| Revoke | اسحَب | **سحب** | An invitation. **Not** إلغاء: that is Cancel, and a console with one word for both leaves the operator unsure what they just undid |
| Refund | استرِد | **استرداد** | |
| Verify | تحقَّق | **تحقُّق** | Form V masdar. The vowel is the whole difference; it is worth writing |
| Take over | استلِم | **استلام** | A queue item |
| Retry / Try again | أعِد المحاولة | **إعادة المحاولة** | The most frequent button in the product — 6 error states |

### The iḍāfa rule that follows from R6

A masdar takes its object in a genitive construction: `حفظ الإعدادات`, `إسناد الرحلة`,
`إسقاط المخالفة`. **The masdar and its object are one grammatical unit and must not be
separated by an interpolation.**

- Wrong: `'حفظ {entity}'` — the placeholder breaks the iḍāfa and the definite article lands
  in the wrong half.
- Right: one key per object, exactly as R7's gender refinement requires.

This is the same conclusion from a different direction, and it is why **AC-75's ban on
concatenation is a grammar rule in Arabic, not a tidiness rule.** `t('save') + ' ' + noun`
produces a string that is not Arabic.

---

## Part 3 — The glossary

**146 terms**, across ten domains. Arabic is the term to use; anything else is a finding. Where the Note column
is empty the term is uncontroversial and listed so nobody re-derives it.

### 3.1 People — 13

| English | Arabic | Note |
|---|---|---|
| captain | كابتن | The market term in Saudi ride-hailing, and the product's own word. **Not** سائق — see §3.11 |
| driver | سائق | The **data layer's** word (`Driver`, `driverId`). Appears in operator copy only where the underlying record is meant |
| rider | راكب | |
| operator | مُشغِّل | A person using this console. Never مستخدم — every actor is a user |
| team member | عضو الفريق | |
| owner | مالك | Of a queue item, of a workspace |
| applicant | مُتقدِّم | Someone in onboarding, not yet a captain |
| corporate client | عميل مؤسسي | |
| employee | موظف | An employee of a corporate client, not of Eyvar |
| customer | عميل | The paying party. A rider is a راكب; the corporate account paying for them is a عميل |
| agent | وكيل | Support agent |
| admin | مسؤول | |
| impersonation | انتحال الهوية | An operator viewing as another. The audit line reads إيقاف انتحال الهوية |

### 3.2 The trip — 21

| English | Arabic | Note |
|---|---|---|
| trip | رحلة | Feminine — see R7's gender note |
| ride | رحلة | Same word. English uses both; Arabic must not invent a distinction |
| leg | مرحلة | One segment of a multi-stop trip |
| request | طلب | |
| booking | حجز | |
| pickup | نقطة الالتقاء | |
| drop-off | نقطة الوصول | |
| route | مسار | |
| zone | منطقة | |
| city | مدينة | |
| dispatch (the screen) | التوزيع المباشر | Live Dispatch |
| dispatch (the action) | إسناد | See R6 |
| auto-match | المطابقة الآلية | |
| match time | زمن المطابقة | |
| surge | تسعير الذروة | Not ارتفاع — the operator is looking at a price multiplier |
| supply | العرض | |
| demand | الطلب | Collides with `request` = طلب. Definite article and context carry it; where a screen shows both, use حجم الطلب |
| shift / on shift | وردية / على الوردية | |
| no-show | عدم الحضور | |
| ghost trip | رحلة وهمية | `TRP_GHOST_COMPLETE` |
| unassigned | غير مُسنَدة | |

### 3.3 Subscriptions — 9

| English | Arabic | Note |
|---|---|---|
| subscription | اشتراك | |
| plan | باقة | Not خطة — باقة is the commercial package |
| renewal | تجديد | |
| freeze | تجميد | Resumable. Distinct from إيقاف |
| cycle | دورة | |
| quota | الحصة | |
| trips completed | الرحلات المكتملة | |
| same-captain | ثبات الكابتن | The `SUB_SAME_CAPTAIN_BROKEN` guarantee |
| reassign | إعادة الإسناد | |

### 3.4 Money — 30

| English | Arabic | Note |
|---|---|---|
| SAR | SAR | Latin, `<bdi>`-isolated (R4). Never ر.س in this console — the ledger is read against exports |
| halala | هللة | 1/100 riyal. The minor unit every money value is stored in |
| wallet | محفظة | |
| balance | الرصيد | |
| fare | الأجرة | |
| fee | رسوم | |
| toll | رسوم الطريق | |
| VAT | ضريبة القيمة المضافة | The acronym VAT stays Latin in a column header; the full form in prose |
| gross | الإجمالي | |
| net | الصافي | |
| margin | الهامش | |
| revenue | الإيرادات | |
| earnings | الأرباح | A captain's, not the company's |
| payout | مستحقات | The amount owed. The action is صرف المستحقات |
| deduction | خصم | |
| refund | استرداد | |
| credit | رصيد دائن | Not رصيد alone — that is `balance` |
| goodwill credit | رصيد حُسن نية | `PAY_GOODWILL` |
| escrow | ضمان | Money held between two parties. `حساب الضمان` for the account |
| hold | حجز | The state of escrowed money |
| release | إفراج | |
| settlement | تسوية | |
| ledger | دفتر الأستاذ | |
| journal | دفتر اليومية | |
| posting | قيد | One line in the ledger |
| trial balance | ميزان المراجعة | |
| invoice | فاتورة | |
| payment gateway | بوابة الدفع | |
| cash shortfall | عجز نقدي | `CASH_SHORTFALL` |
| rate card | جدول التعرفة | |

### 3.5 Support and disputes — 17

| English | Arabic | Note |
|---|---|---|
| ticket | تذكرة | |
| dispute | نزاع | The case. To dispute (verb) is الاعتراض |
| claim (money) | مطالبة | |
| claim (a queue item) | استلام | **Two Arabic words for one English one.** See §3.11 |
| complaint | شكوى | |
| case | حالة | |
| conversation | محادثة | |
| message | رسالة | |
| reply | رد | |
| escalation | تصعيد | |
| resolution | حلّ | |
| reason code | رمز السبب | The code itself stays Latin (`CAP_LATE`); its *label* is what translates |
| taxonomy | التصنيف | `OTHER_UNCODED` — "needs a taxonomy review" |
| SLA | SLA | Latin acronym, `<bdi>`-isolated. Spell out as اتفاقية مستوى الخدمة on first use in prose only |
| breach | إخلال | An SLA breach. Not انتهاك — that is a violation of a rule, not a missed clock |
| deadline | الموعد النهائي | |
| queue | قائمة العمل | Not طابور. The §8.4 work queues |

### 3.6 Safety and compliance — 13

| English | Arabic | Note |
|---|---|---|
| incident | حادثة | |
| severity | درجة الخطورة | |
| critical | حرِج | |
| acknowledge | إقرار | Masdar, per R6 |
| strike | مخالفة | Against a captain's record |
| suspension | إيقاف | |
| appeal | تظلُّم | `DRV_SUSPENSION_APPEAL` |
| offboard | إنهاء الخدمة | |
| verification | تحقُّق | |
| document | مستند | |
| expiry | انتهاء الصلاحية | |
| audit trail | سجل التدقيق | |
| retention | مدة الاحتفاظ | Data retention |

### 3.7 Fairness — 6

| English | Arabic | Note |
|---|---|---|
| fairness | الإنصاف | Not العدالة — that is justice in the legal sense |
| rating | التقييم | |
| unfair rating | تقييم غير منصف | `DRV_RATING_DISPUTE` |
| exposure | فرص العمل | The share of dispatch a captain is offered. A literal تعرُّض is meaningless here |
| allocation | التوزيع | |
| score | النتيجة | |

### 3.8 The console itself — 15

| English | Arabic | Note |
|---|---|---|
| workspace | مساحة العمل | The five top-level areas |
| sub-tab | تبويب فرعي | |
| view | العرض | A saved table configuration |
| filter | تصفية | |
| column | عمود | |
| overview | نظرة عامة | |
| report | تقرير | |
| measure | مقياس | Report Builder |
| dimension | بُعد | Report Builder |
| alert | تنبيه | |
| notification | إشعار | |
| template | قالب | |
| campaign | حملة | |
| undo | تراجع | |
| refusal | تعذُّر التنفيذ | Why a command is unavailable. Not رفض — that is Reject, an operator's decision |

### 3.9 Access and identity — 10

| English | Arabic | Note |
|---|---|---|
| permission | صلاحية | |
| role | دور | |
| session | جلسة | |
| device | جهاز | |
| sign in | تسجيل الدخول | Masdar |
| sign out | تسجيل الخروج | |
| one-time code | رمز لمرة واحدة | |
| invitation | دعوة | |
| policy | سياسة | |
| activate | تفعيل | |

### 3.10 States — 12

State labels are **adjectives** and agree with the noun's gender. The masculine form is
given; a feminine noun (رحلة, تذكرة, حالة, دورة) takes the ة.

| English | Arabic (m.) | Note |
|---|---|---|
| active | نشط | |
| pending | قيد الانتظار | Invariable — no agreement needed |
| in progress | قيد التنفيذ | Invariable |
| completed | مكتمل | |
| cancelled | ملغى | |
| expired | منتهي الصلاحية | |
| suspended | موقوف | |
| resolved | محلول | |
| escalated | مُصعَّد | |
| flagged | مُعلَّم | |
| claimed | مُستلَم | |
| overdue | متأخر | An SLA past its deadline |

---

## Part 4 — One English word, two Arabic terms

The list that stops a translator guessing. Each of these is a real collision in the shipped
copy, and each has been resolved by *meaning*, not by picking a favourite.

| English | Sense | Arabic |
|---|---|---|
| **claim** | a monetary claim against the company | مطالبة |
| | taking ownership of a queue item | استلام |
| **release** | letting escrowed money go | إفراج |
| | publishing a version | إصدار |
| **hold** | money held in escrow | حجز |
| | a hold placed on an account | تعليق |
| **cancel** | the operator abandons the form | إلغاء |
| | a trip is cancelled by a party | إلغاء الرحلة |
| **revoke** | withdrawing an invitation | سحب |
| **suspend** | stopping a captain or surge indefinitely | إيقاف |
| **freeze** | pausing a subscription, resumable | تجميد |
| **reject** | an operator's decision on an application | رفض |
| **refusal** | the system explaining why a command is unavailable | تعذُّر التنفيذ |
| **balance** | the wallet figure | الرصيد |
| **credit** | a credit posting | رصيد دائن |
| **request** | a rider's trip request | طلب |
| **demand** | market demand | حجم الطلب |
| **plan** | the commercial package a rider buys | باقة |
| **plan** | a report plan | خطة |
| **breach** | a missed SLA clock | إخلال |
| **violation** | a broken rule | انتهاك |
| **fairness** | the captain-allocation discipline | الإنصاف |
| **exposure** | the share of dispatch offered | فرص العمل |

---

## Part 5 — What stays in Latin

**R4, made concrete.** These are never translated and are always `<bdi>`-isolated
(`src/lib/i18n/isolate.ts`). Without the isolation a leading `+` or a trailing `:` jumps to
the wrong side of the string, and the token renders *reversed* — not merely misaligned.

| Kind | Example | Why |
|---|---|---|
| The brand | `Eyvar` | Proper noun |
| Currency | `SAR` | Read against exports and bank statements |
| Reference ids | `RDR-4821`, `TRP-92014` | Typed into another system verbatim |
| Reason codes | `CAP_LATE` | A machine identifier. Its **label** translates; it does not. Never rename a code — a stale key puts the raw identifier on screen |
| Permission keys | `manage_ops_policy` | Same reason |
| Plates | `ABC 1234` | Numeral run — never mirrored |
| IBAN, phone | `SA03 8000 …`, `+966 …` | Numeral run |
| Acronyms | `SLA`, `VAT`, `API`, `PWA`, `CSV` | Spelled out on first use in prose only |
| Timestamps | `25 Jun 09:39` | The digits are Western (R8); the **order** must not reverse — this is gap A2 |

---

## Part 6 — Out of scope, deliberately

- **The translation itself.** `AR: Dictionary = {}` stays empty until a workspace is
  complete. A half-Arabic console is the policy §9.3 exists to retire, and the empty
  dictionary is AC-74's own test fixture.
- **Order of work.** By **workspace**, not alphabetically: ship Operations whole before
  starting Financials (`18` §2.3 step 4).
- **The four engineering gaps.** A1–A4 in [`docs/ref/i18n.md`](../../ref/i18n.md). A
  glossary does not close any of them, and translating over A4 — the identity column that
  collapses to 38px at 1280, against Arabic's 4–8% extra width — gets Arabic blamed for a
  layout bug that predates it. **Run the pseudo-locale first**: `npm run dev:pseudo` renders
  every string 35% longer, which is the same failure at four times the volume, in English,
  today.
