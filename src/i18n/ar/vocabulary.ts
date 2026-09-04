/**
 * Arabic - the reason-code labels (src/i18n/vocabulary/copy.ts).
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

export const VOCABULARY_AR: Dictionary = {
  'reason.CAP_CANCEL_ADV': 'ألغى الكابتن مسبقًا',
  'reason.CAP_LATE': 'تأخّر الكابتن عن نقطة الالتقاء',
  'reason.CAP_NOSHOW': 'عدم حضور الكابتن',
  'reason.CAP_OFFPLATFORM_PAY': 'طلب الكابتن دفعًا نقديًا خارج المنصة',
  'reason.CAP_CONDUCT': 'سلوك غير لائق من الكابتن',
  'reason.BKG_CANCEL_REQ': 'ألغى الراكب الحجز',
  'reason.BKG_WRONG_SLOT': 'حجز الراكب تاريخًا أو وقتًا خاطئًا',
  'reason.BKG_NO_SUPPLY': 'لا يوجد كابتن متاح في المنطقة',
  'reason.PAY_INCORRECT_CHARGE': 'خُصم من الراكب مبلغ خاطئ',
  'reason.PAY_DECLINED': 'فشل الدفع أو رُفض',
  'reason.PAY_REFUND_REQ': 'طلب الراكب استردادًا',
  'reason.PAY_GOODWILL': 'رصيد حُسن نية، دون خطأ ثابت',
  'reason.TRP_ROUTE_DEVIATION': 'سلك الكابتن مسارًا خاطئًا',
  'reason.TRP_LOST_ITEM': 'ترك الراكب متعلقات في المركبة',
  'reason.TRP_GHOST_COMPLETE': 'اكتملت الرحلة دون أن يركب الراكب',
  'reason.TRP_FALSE_COMPLETE': 'أنهى الكابتن رحلة لم تُنفَّذ',
  'reason.TECH_STATE_DESYNC': 'عدم تطابق حالة الرحلة — التطبيقان غير متفقين',
  'reason.APP_LOGIN': 'الراكب لا يستطيع تسجيل الدخول',
  'reason.APP_CRASH': 'التطبيق يتعطّل أو لا يفتح',
  'reason.APP_PROMO': 'لم يُطبَّق رمز العرض',
  'reason.SAF_RIDER_UNSAFE': 'شعر الراكب بعدم الأمان أثناء الرحلة',
  'reason.SAF_ACCIDENT': 'حادث أو عطل في المركبة',
  'reason.SAF_THEFT': 'فقدان غرض أو سرقته أثناء الرحلة',
  'reason.SUB_SAME_CAPTAIN_BROKEN': 'تغيّر الكابتن المُسنَد أثناء الباقة',
  'reason.SUB_FREEZE_TRAVEL': 'الراكب مسافر — جُمِّدت الباقة',
  'reason.SUB_FREEZE_MEDICAL': 'سبب طبي — جُمِّدت الباقة',
  'reason.DRV_RATING_DISPUTE': 'يعترض الكابتن على تقييم غير منصف',
  'reason.DRV_DEDUCTION_DISPUTE': 'يعترض الكابتن على خصم',
  'reason.DRV_SUSPENSION_APPEAL': 'يتظلّم الكابتن من إيقاف',
  'reason.DRV_DOC_EXPIRED': 'انتهت صلاحية مستند مطلوب',
  'reason.CASH_SHORTFALL': 'النقد المحصَّل لا يطابق الرحلة',
  'reason.OTHER_UNCODED': 'أخرى — تحتاج إلى مراجعة التصنيف',
  'reason.BKG_CAPTAIN_PREF': 'طلب الراكب كابتن آخر',
  'reason.DRV_RIDER_NOSHOW': 'لم يحضر الراكب للرحلة',
  'reason.DRV_RIDER_CONDUCT': 'سلوك غير لائق من الراكب',
  'reason.DRV_VEHICLE_DAMAGE': 'أتلف الراكب المركبة',
  'reason.fare_dispute': 'يعترض الراكب على الأجرة',
  'reason.lost_item': 'ترك الراكب متعلقات في المركبة',
  'reason.captain_absence': 'لم يصل الكابتن لرحلة مجدولة',
  'reason.app_issue': 'بلاغ عن خلل في التطبيق',
  'reason.payout_blocked': 'رُفض صرف المستحقات بناءً على البيانات المسجَّلة',
  'reason.dispute_no_show': 'اعتراض — عدم الحضور',
  'reason.dispute_vehicle_class': 'اعتراض — فئة المركبة',
  'reason.dispute_fare_dispute': 'اعتراض — الأجرة',
  'reason.dispute_toll_charge': 'اعتراض — رسوم الطريق',
  'reason.dispute_cancellation_fee': 'اعتراض — رسوم الإلغاء',
  'reason.dispute_vehicle_damage': 'اعتراض — إتلاف المركبة',
}

/**
 * Arabic — the rider vocabulary the data layer emits (`rider.*`), the mirror of
 * `RIDER_VOCABULARY_EN` in `src/i18n/vocabulary/copy.ts`, key for key and in the
 * same order.
 *
 * ## `rider.churn.*` is LIFTED, not re-translated
 *
 * These six were first written into `src/i18n/ar/riderProfile.ts` by the rider
 * sheet's author, alongside that sheet's own `profile.rider.*` keys and while no
 * English counterpart was registered anywhere. They are reproduced here
 * **character for character**. Re-spelling a shipped Arabic string to suit a new
 * file is exactly the drift the shared module exists to prevent, and a reviewer
 * diffing the two files should find nothing.
 *
 * ## `rider.timeline.*` follows the glossary's rulings
 *
 * `design/20-arabic-glossary.md`: Arabic punctuation (R1), the terminal full
 * stop last (R2), one MSA register (R3), Latin proper nouns left alone (R4),
 * and Western digits (R8).
 *
 * **The titles are nominal, not verbal** — `طلب رحلة`, `اكتمال رحلة`,
 * `إلغاء اشتراك`. A timeline title names an event rather than telling an
 * operator to do something, and a consistent masdar-shaped noun phrase reads as
 * a dated log in Arabic where a past-tense verb reads as prose. R6's masdar
 * ruling is about buttons; this is the same grammatical form arrived at for a
 * different reason, and the two do not conflict.
 *
 * **`←` and not `→`.** §9.5: a glyph that mirrors is swapped at
 * string-construction time and never with CSS, and a dictionary is string
 * construction time. `profile.rider.trip.route` already carries the same swap.
 *
 * **No count agreement is attempted, and that is deliberate.** Arabic inflects a
 * counted noun five ways and `رحلة` after `من {total}` is the singular the
 * `N من M` frame takes at every value — the construction
 * `profile.rider.rail.planLegs` already ships. It is a ratio, not a count that
 * selects a plural form, so `t.plural` would have nothing to select on. The one
 * genuine count in this file, `rider.churn.complaintsFiled`, is phrased so the
 * numeral trails the noun for the reason the English does: `formatLocalisedText`
 * resolves through `Translate`, which has no `.plural`.
 */

export const RIDER_VOCABULARY_AR: Dictionary = {
  'rider.churn.noSubscription': 'لا يوجد اشتراك — رحلات سريعة فقط.',
  'rider.churn.cancelledOnRecord': 'يوجد اشتراك ملغى على السجل.',
  'rider.churn.complaintsFiled': 'الشكاوى المسجّلة: {count}',
  'rider.churn.ratingBelowFour': 'التقييم أقل من 4.',
  'rider.churn.lowRenewalRate': 'معدل التجديد {percent}%.',
  'rider.churn.lapsedUnused': 'انتهى الاشتراك دون استخدام أي رحلة.',

  'rider.timeline.account-registered.title': 'تسجيل الحساب',
  'rider.timeline.trip-requested.title': 'طلب رحلة',
  'rider.timeline.trip-completed.title': 'اكتمال رحلة',
  'rider.timeline.trip-cancelled.title': 'إلغاء رحلة',
  /* Neutral about whose no-show, as the English is. `profile.tripStatus.no-show`
     renders the same status as a bare `عدم حضور` for the same reason. */
  'rider.timeline.trip-no-show.title': 'عدم حضور في رحلة',
  'rider.timeline.subscription-started.title': 'بدء اشتراك',
  'rider.timeline.subscription-expired.title': 'انتهاء اشتراك',
  'rider.timeline.subscription-cancelled.title': 'إلغاء اشتراك',

  'rider.timeline.account-registered.subtitle': '{location} · فئة {tier}',
  'rider.timeline.trip-requested.subtitle': '{pickup} ← {destination}',
  'rider.timeline.trip-completed.subtitle': '{pickup} ← {destination}',
  'rider.timeline.trip-cancelled.subtitle': '{pickup} ← {destination}',
  'rider.timeline.trip-no-show.subtitle': '{pickup} ← {destination}',
  'rider.timeline.subscription-started.subtitle': '{plan} · {from} ← {to}',
  'rider.timeline.subscription-expired.subtitle': '{plan} · استُخدمت {used} من {total} رحلة',
  'rider.timeline.subscription-cancelled.subtitle': '{plan} · استُخدمت {used} من {total} رحلة',

  /* `فئة {tier}` and not `{tier}` alone: a key whose whole string is one
     placeholder is a pass-through, and `types/metrics.ts` deleted one for being
     "a fig leaf". The noun is what makes `برونزية` legible on its own. */
  'rider.timeline.account-registered.subtitleNoPlace': 'فئة {tier}',
  'rider.timeline.trip.routePickupOnly': 'من {pickup} — لم تُحدَّد الوجهة',
  'rider.timeline.trip.noCaptain': 'لم يُسنَد أي كابتن.',
  /* The open-trip card's present tense. See the English for why it is a second
     sentence and not a second spelling. */
  'rider.trip.noCaptainYet': 'لم يُسنَد كابتن بعد.',
}

/**
 * Arabic — the captain timeline vocabulary (`driver.*`), the mirror of
 * `DRIVER_VOCABULARY_EN` in `src/i18n/vocabulary/copy.ts`, key for key and in
 * the same order.
 *
 * ## The five shared titles are the SAME WORDS as the rider's
 *
 * `account-registered` and the four trip kinds are worded here exactly as they
 * are in `RIDER_VOCABULARY_AR` — `تسجيل الحساب`, `طلب رحلة`, `اكتمال رحلة`,
 * `إلغاء رحلة`, `عدم حضور في رحلة`. It is the same event on a different record.
 * An operator moving between a rider's profile and a captain's should not have
 * to notice which one they are on to read the word, and two spellings of one
 * event is the drift this module exists to stop.
 *
 * They are **restated rather than referenced**, because a dictionary is a flat
 * map of literals — a value read from another object is a value no extractor
 * and no reviewer can see beside its key. `vocabulary.test.ts` asserts the five
 * pairs still agree, in both languages, so the duplication cannot drift.
 *
 * ## The rulings this follows
 *
 * `design/20-arabic-glossary.md`: Arabic punctuation (R1), the terminal full
 * stop last (R2), one MSA register (R3), Latin proper nouns and acronyms left
 * alone (R4), Western digits (R8). Titles are nominal — `انتهاء صلاحية مستند`,
 * `تغيير الحساب البنكي` — for the reason the rider's are: a timeline title names
 * an event rather than instructing an operator, and a consistent masdar-shaped
 * noun phrase reads as a dated log where a past-tense verb reads as prose.
 *
 * **`←` and not `→`** on the bank change. §9.5: a glyph that mirrors is swapped
 * at string-construction time and never with CSS. `{fromBank} ← {toBank}` is a
 * transition read the other way, the same rule the rider's route follows.
 *
 * ## Two interpolations that are NOT translated
 *
 * `{fromBank}` / `{toBank}` are bank names and `{reason}` is operator prose.
 * R4 leaves a proper noun alone and nothing translates what somebody wrote, so
 * all three travel as data. Each is a strong-first-character run and the render
 * site isolates it in a bare content-sized `<bdi>` — a Latin bank name inside
 * this Arabic sentence reorders around the arrow otherwise.
 */

export const DRIVER_VOCABULARY_AR: Dictionary = {
  /* The five shared with the rider's timeline, character for character. */
  'driver.timeline.account-registered.title': 'تسجيل الحساب',
  'driver.timeline.trip-requested.title': 'طلب رحلة',
  'driver.timeline.trip-completed.title': 'اكتمال رحلة',
  'driver.timeline.trip-cancelled.title': 'إلغاء رحلة',
  'driver.timeline.trip-no-show.title': 'عدم حضور في رحلة',
  /* The two the captain's record has and the rider's does not. */
  'driver.timeline.document-expired.title': 'انتهاء صلاحية مستند',
  'driver.timeline.bank-account-changed.title': 'تغيير الحساب البنكي',

  /* `فئة {tier}` keeps the noun because `people.tier.*` are FEMININE adjectives
     — `ذهبية`, `فضية`, `قياسية` — which agree with `فئة` and would be
     ungrammatical after a masculine noun such as `المستوى`. `مركبة` does the
     same work for `people.class.*` (`اقتصادية`, `مريحة`). */
  'driver.timeline.account-registered.subtitle': 'فئة {tier} · مركبة {vehicleClass}',
  'driver.timeline.trip-requested.subtitle': 'الراكب: {riderName}',
  'driver.timeline.trip-completed.subtitle': 'الراكب: {riderName}',
  'driver.timeline.trip-cancelled.subtitle': 'الراكب: {riderName}',
  'driver.timeline.trip-no-show.subtitle': 'الراكب: {riderName}',
  'driver.timeline.document-expired.subtitle': 'المستند: {docType}',
  'driver.timeline.bank-account-changed.subtitle': '{fromBank} ← {toBank}',

  'driver.timeline.bank-account-changed.note': 'السبب: {reason}',
}
