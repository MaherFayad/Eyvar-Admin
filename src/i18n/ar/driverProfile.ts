/**
 * Arabic for the captain profile — the mirror of
 * `src/components/profile/driver/copy.ts`, key for key and in the same order.
 *
 * Terms already translated elsewhere are **reused and deliberately not
 * restated**: `كابتن` (`profile.kind.driver`), `موقوف` / `قيد المراجعة`
 * (`people.driverStatus.*`), `المستندات` and the five document names
 * (`people.col.doc.*`), `الكل سارٍ` / `يقارب الانتهاء` / `منتهٍ` / `لا يوجد ملف`
 * (`people.compliance.worst.*`), `المركبة` and `الحساب البنكي`
 * (`profile.field.*`), `الرصيد الافتتاحي` / `الرصيد الختامي` and the payout and
 * deduction states (`fin.*`). A second spelling of a word already on the
 * Compliance table is a second place for it to drift.
 *
 * ## The six CLDR categories, on every plural family
 *
 * Arabic is `zero · one · two · few (3–10) · many (11–99) · other (100+)`
 * against English's two, and `lib/i18n/inventory.test.ts` fails a family Arabic
 * cannot resolve at some count. It is not pedantry on this screen: a captain
 * with two open complaints needs the dual and one with four needs the paucal,
 * and a document `24 days` from expiry lands in `many` while one `4 days` away
 * lands in `few`. The numeral is dropped from `#zero`, `#one` and `#two`
 * because Arabic names those counts inside the noun; `interpolate` permits a
 * translation to drop a placeholder the English declares and throws only on the
 * reverse.
 *
 * ## Two register choices worth recording
 *
 * **`المستحقات` for *Earnings*, not `الأرباح`.** The block is a **payable** —
 * money Eyvar owes this captain and has not yet paid — and `أرباح` is profit
 * earned, which is the accrual and not the balance. `مستحقات` is what is *due
 * to* somebody, which is exactly what `liability.driver` holds.
 *
 * **`الوضع` for *Standing*, not `الحالة`.** `الحالة` is already `Status`
 * (`profile.field.status`), and this block's value IS that status; naming the
 * block with the same word would read as `Status: Status`. `الوضع` is the
 * captain's standing — whether they may work — which is the question the block
 * answers.
 */

import type { Dictionary } from '@/lib'

export const DRIVER_PROFILE_AR: Dictionary = {
  /* ── the band ─────────────────────────────────────────────────────── */
  'profile.driver.meta.rating': 'التقييم {rating}',
  'profile.driver.meta.noRating': 'لم يُقيَّم بعد',
  'profile.driver.meta.joined': 'يقود منذ {date}',

  /* ── the standing banner ──────────────────────────────────────────── */
  'profile.driver.banner.suspended.title': 'هذا الكابتن موقوف',
  'profile.driver.banner.suspended.body':
    'لا يتلقى رحلات ولا يشغل مقاعد اشتراك ما دام الإيقاف قائمًا. السبب المسجَّل: {reason}',
  'profile.driver.banner.suspended.noReason':
    'لا يتلقى رحلات ولا يشغل مقاعد اشتراك ما دام الإيقاف قائمًا. لم يُسجَّل سبب للإيقاف.',
  'profile.driver.banner.planTerminated.title': 'الوصول إلى الاشتراكات منتهٍ',
  'profile.driver.banner.planTerminated.body':
    'هذا الكابتن يعمل على الرحلات الفورية فقط، ولا يمكن إسناده إلى اشتراك.',
  'profile.driver.banner.planFrozen.title': 'الوصول إلى الاشتراكات مجمَّد حتى {date}',
  'profile.driver.banner.planFrozen.body':
    'تستمر الاشتراكات القائمة. لا يمكن إسناد اشتراك جديد قبل ذلك التاريخ.',

  /* ── block 1 · standing ───────────────────────────────────────────── */
  'profile.driver.block.standing': 'الوضع',
  'profile.driver.standing.clear': 'لا توجد ملاحظات على هذا السجل.',
  'profile.driver.flag.suspended': 'موقوف',
  'profile.driver.flag.complaints#zero': 'لا توجد شكاوى مفتوحة',
  'profile.driver.flag.complaints#one': 'شكوى مفتوحة واحدة',
  'profile.driver.flag.complaints#two': 'شكويان مفتوحتان',
  'profile.driver.flag.complaints#few': '{count} شكاوى مفتوحة',
  'profile.driver.flag.complaints#many': '{count} شكوى مفتوحة',
  'profile.driver.flag.complaints#other': '{count} شكوى مفتوحة',
  'profile.driver.flag.declines': 'مُعلَّم لرفض الرحلات',
  'profile.driver.flag.manual': 'مُعلَّم للمراجعة من مشغِّل',
  'profile.driver.flag.planFrozen': 'الوصول إلى الاشتراكات مجمَّد حتى {date}',
  'profile.driver.flag.planTerminated': 'الوصول إلى الاشتراكات منتهٍ',
  /* **`قيد التوثيق` and `مرفوض` are `profile.driver.bank.status.*`'s own
     words, reused.** The badge on the payout account and the flag in the
     standing list state one fact about one account, and a second Arabic
     spelling of `Pending verification` two inches away is a second place for it
     to drift — the same argument that keeps the five document names on
     `people.col.doc.*`.

     **Both are nominal sentences, and that is deliberate.** English reads `was
     rejected`, a past verb, but a standing flag reports a condition that holds
     NOW rather than an event that happened; Arabic states a present condition
     nominally. Keeping the pair parallel — `الحساب البنكي` + a state word —
     also makes them read as two values of one fact in the list, which is what
     they are. */
  'profile.driver.flag.bankPending': 'الحساب البنكي قيد التوثيق',
  'profile.driver.flag.bankRejected': 'الحساب البنكي مرفوض',
  'profile.driver.flag.noBankAccount': 'لا يوجد حساب بنكي في الملف',
  'profile.driver.flag.payoutReturned': 'أعاد البنك آخر تحويل',

  /* ── block 2 · documents ──────────────────────────────────────────── */
  'profile.driver.block.documents': 'المستندات',
  'profile.driver.documents.soonest': 'ينتهي {document} في {date}',
  'profile.driver.documents.expired': 'انتهى {document} في {date}',
  'profile.driver.documents.count#zero': 'لا توجد مستندات في الملف',
  'profile.driver.documents.count#one': 'مستند واحد في الملف',
  'profile.driver.documents.count#two': 'مستندان في الملف',
  'profile.driver.documents.count#few': '{count} مستندات في الملف',
  'profile.driver.documents.count#many': '{count} مستندًا في الملف',
  'profile.driver.documents.count#other': '{count} مستند في الملف',
  'profile.driver.documents.none': 'لا توجد مستندات في الملف',
  'profile.driver.documents.empty': 'لا توجد مستندات مسجَّلة لهذا الكابتن.',
  'profile.driver.documents.daysLeft#zero': 'ينتهي اليوم',
  'profile.driver.documents.daysLeft#one': 'يتبقى يوم واحد',
  'profile.driver.documents.daysLeft#two': 'يتبقى يومان',
  'profile.driver.documents.daysLeft#few': 'تتبقى {count} أيام',
  'profile.driver.documents.daysLeft#many': 'يتبقى {count} يومًا',
  'profile.driver.documents.daysLeft#other': 'يتبقى {count} يوم',
  'profile.driver.documents.daysAgo#zero': 'انتهى اليوم',
  'profile.driver.documents.daysAgo#one': 'انتهى منذ يوم',
  'profile.driver.documents.daysAgo#two': 'انتهى منذ يومين',
  'profile.driver.documents.daysAgo#few': 'انتهى منذ {count} أيام',
  'profile.driver.documents.daysAgo#many': 'انتهى منذ {count} يومًا',
  'profile.driver.documents.daysAgo#other': 'انتهى منذ {count} يوم',
  'profile.driver.documents.today': 'ينتهي اليوم',
  'profile.driver.documents.suspendedBy': 'أوقفت الالتزامية هذا الكابتن: {reason}',

  /* ── the expanded row (D-CP-7, §6) ────────────────────────────────────
     The four derivation sentences reuse `profile.docState.*`'s own words —
     سارٍ / يقارب الانتهاء / ينتهي قريبًا / منتهٍ — so the sentence and the badge
     above it cannot drift apart in Arabic the way two independent translations
     of the same bucket would.

     §8.3 — *"'30 days or fewer' is a threshold, not a duration: translate the
     comparison, not the phrase."* So `30 يومًا أو أقل`, not a plural family.
     Digits stay Western (§9.2). */
  'profile.driver.documents.why.valid': 'مُصنَّف سارٍ لأن المتبقي أكثر من 30 يومًا.',
  'profile.driver.documents.why.expiring':
    'مُصنَّف يقارب الانتهاء لأن المتبقي 30 يومًا أو أقل.',
  'profile.driver.documents.why.critical':
    'مُصنَّف ينتهي قريبًا لأن المتبقي 7 أيام أو أقل.',
  'profile.driver.documents.why.expired': 'مُصنَّف منتهٍ لأن التاريخ قد مضى.',
  /* `مسجَّلة` matches `documents.empty` and `profile.docState.unknown`, so *no
     record of it* reads the same way everywhere on this surface. It is a claim
     that the scan does NOT exist, never a dash (§8.3.1). */
  'profile.driver.documents.noScan': 'لا توجد نسخة ممسوحة مسجَّلة لهذا المستند.',
  /* `بواسطة {who}` is `adminData.retention.lastSaved`'s construction, verbatim —
     one way of naming an actor in this dictionary rather than two. */
  'profile.driver.documents.uploaded': 'رُفع في {date} بواسطة {name}',

  /* ── the scan viewer — owner amendment 3, §8.1b / §9B ─────────────────
     `النسخة الممسوحة` is `documents.noScan`'s own word for a scan and is reused
     here rather than a second one invented: §6.5a.0 fixes the vocabulary in
     both languages, and a *document* (`مستند`) is never a *scan*
     (`نسخة ممسوحة`) on either side of the dictionary.

     `PDF` stays Latin, as `KB` / `MB` and `SAR` already do (§9B item 6). */
  'profile.driver.documents.openScan': 'فتح النسخة الممسوحة',
  /* The accessible name. `{document}` stays `<bdi>`-isolated at the call site —
     a Latin document label inside an Arabic accessible name reorders otherwise,
     and a screen reader reads the reordered string (§9B item 4). It contains
     the visible label contiguously, which is WCAG 2.5.3 in Arabic exactly as it
     is in English (AC-CP-138). */
  'profile.driver.documents.openScanNamed': 'فتح النسخة الممسوحة: {document}',
  'profile.driver.documents.download': 'تنزيل',
  'profile.driver.documents.downloadNamed': 'تنزيل: {document}',
  /* **§9B item 6 — the second sentence quotes the ARABIC control label, never
     the English one.** This is the one string in §8.1b that cannot be
     translated independently of another key: it echoes
     `documents.openScan` above, in the imperative, exactly as the English
     echoes `Open scan` as *Open the scan*. */
  'profile.driver.documents.pdfNoPreview':
    'لا توجد معاينة لملف PDF. افتح النسخة الممسوحة لقراءته.',
  /* `تعذّر تحميل` is `profile.state.error`'s verb, so a failed scan and a failed
     section fail in one voice. */
  'profile.driver.documents.scanError': 'تعذّر تحميل هذه النسخة الممسوحة. أعد المحاولة.',
  /* States what happened and stops — no remedy, because retrying cannot help
     and this console cannot upload. */
  'profile.driver.documents.scanGone': 'يشير السجل إلى نسخة ممسوحة لم تعد موجودة في التخزين.',
  /* **The size unit is not here any more, and it is not `كيلوبايت` any more.**
     These two keys localised the unit, reasoning from `earnings.unit` being
     `ر.س` rather than `SAR`. The product-wide answer went the other way:
     `src/lib/format/fileSize.ts` rules `KB` / `MB` Latin acronyms of the same
     kind §9.6 keeps in English inside an Arabic string, and `src/i18n/ar/
     fileSize.ts` ships them byte-identical to the English side. A captain's
     document row now reads `240 KB` in Arabic, like the attachment chip and the
     workspace logo. */

  /* ── block 3 · earnings ───────────────────────────────────────────── */
  'profile.driver.block.earnings': 'المستحقات',
  'profile.driver.earnings.unit': 'ر.س',
  'profile.driver.earnings.payable': 'مستحقة لهذا الكابتن',
  /* A negative payable is a real state: `DRV-0202` is −1,500 and the captain
     owes ON the payable account, so `مستحقة لهذا الكابتن` is false there. */
  'profile.driver.earnings.negative': 'مستحقة على هذا الكابتن',
  'profile.driver.earnings.lastPaid': 'آخر دفعة في {date}',
  'profile.driver.earnings.neverPaid': 'لم تُصرف أي دفعة بعد',
  /* Owner amendment 4 (§13.5) — one fragment where four sentences were.
     `المستحقات` is the glossary's *payable* (`20-arabic-glossary.md:194`) and
     the same word the shipped `profile.driver.earnings.postings` uses. Feminine
     agreement follows `profile.rider.money.outsideBalance`'s `غير محتسبة`. No
     period, matching the English fragment (R6). */
  'profile.driver.earnings.notInPayable': 'غير مُدرَجة ضمن المستحقات',
  'profile.driver.earnings.empty': 'لم تُقيَّد أي حركة على مستحقات هذا الكابتن بعد.',
  'profile.driver.earnings.postings': 'حركات المستحقات',
  /* AC-308 — the direction convention, stated once. On `liability.driver` a
     credit grows what Eyvar owes, which is the opposite of a wallet. */
  'profile.driver.earnings.direction': 'الدائن مبلغ مكتسب. المدين مبلغ مصروف أو مخصوم.',

  /* ── block 4 · capacity ───────────────────────────────────────────── */
  'profile.driver.block.capacity': 'مقاعد الاشتراكات',
  'profile.driver.capacity.used': 'شُغل {used} من {total} مقعدًا',
  'profile.driver.capacity.full': 'لا توجد مقاعد شاغرة',
  'profile.driver.capacity.open#zero': 'لا توجد مقاعد شاغرة',
  'profile.driver.capacity.open#one': 'مقعد شاغر واحد',
  'profile.driver.capacity.open#two': 'مقعدان شاغران',
  'profile.driver.capacity.open#few': '{count} مقاعد شاغرة',
  'profile.driver.capacity.open#many': '{count} مقعدًا شاغرًا',
  'profile.driver.capacity.open#other': '{count} مقعد شاغر',
  'profile.driver.capacity.exception': 'استثناء تعدد الاشتراكات ممنوح',
  'profile.driver.capacity.none': 'لا توجد سعة اشتراكات على هذا السجل',

  /* ── the tabs ─────────────────────────────────────────────────────── */
  'profile.driver.tab.documents': 'المستندات',
  'profile.driver.tab.earnings': 'المستحقات',
  'profile.driver.tab.activity': 'النشاط',

  /* ── the cards both surfaces render ───────────────────────────────── */
  'profile.driver.card.payout': 'حساب التحويل',
  /* `profile.driver.card.performance` is deleted with its English side — the
     card is two figure rows now and a figure row takes no heading (AC-CP-93). */

  /* ── the figure rows (D-CP-13) ────────────────────────────────────────
     Only four keys are new. The six labels the two rows print — `التقييم`,
     `الالتزام بالوقت`, `الرحلات المكتملة`, `أرباح هذا الشهر`, `رحلات هذه
     الفترة`, `لم يُقيَّم بعد` — are already translated and are reused, so a
     fact that moved from a field to a figure did not change its Arabic word. */
  /* `في {date}` is `profile.driver.earnings.lastPaid`'s construction
     (`آخر دفعة في {date}`), verbatim — one way of dating a last event in this
     dictionary rather than two. A fragment, so no full stop. */
  'profile.driver.figure.lastTrip': 'آخر رحلة في {date}',
  /* `بعد` matches `لم يُقيَّم بعد` and `لم تُصرف أي دفعة بعد`: *not yet*, which
     is a statement about the record and not about the read. */
  'profile.driver.figure.noTrips': 'لا توجد رحلات بعد',
  /* *Not enough history* — the rate was never computable. `سجل` is the record
     of past trips, not `التاريخ`, which is a date on this surface. */
  'profile.driver.figure.noOnTime': 'لا يوجد سجل كافٍ',
  /* `فترة تحويل` uses `التحويل`, the word `profile.driver.field.payoutState`
     and `.lastPayout` already carry for a payout. */
  'profile.driver.figure.noPeriod': 'لا توجد فترة تحويل بعد',
  'profile.driver.bank.status.verified': 'موثَّق',
  'profile.driver.bank.status.pending': 'قيد التوثيق',
  'profile.driver.bank.status.rejected': 'مرفوض',
  'profile.driver.field.iban': 'رقم الآيبان',
  'profile.driver.field.accountHolder': 'صاحب الحساب',
  'profile.driver.field.bankName': 'البنك',
  'profile.driver.field.lastPayout': 'آخر تحويل',
  'profile.driver.field.payoutState': 'حالة التحويل',
  'profile.driver.field.tripsInPeriod': 'رحلات هذه الفترة',
  'profile.driver.field.cashDebt': 'الدين النقدي',
  'profile.driver.field.escrowHeld': 'محجوز في الضمان',
  'profile.driver.field.payoutInFlight': 'تحويل قيد التنفيذ',
  'profile.driver.field.pendingDeductions': 'خصومات معلَّقة',
  'profile.driver.field.capacity': 'مقاعد الاشتراكات',

  /* ── the timeline ─────────────────────────────────────────────────── */
  'profile.driver.activity.empty': 'لم يحدث شيء على هذا السجل بعد.',
  'profile.driver.timeline.registered': 'تسجيل الحساب · الدرجة {tier}، {vehicleClass}',
  'profile.driver.timeline.tripRequested': 'طُلبت رحلة · {rider}',
  'profile.driver.timeline.tripCompleted': 'اكتملت رحلة · {rider}',
  'profile.driver.timeline.tripCancelled': 'أُلغيت رحلة · {rider}',
  'profile.driver.timeline.tripNoShow': 'لم يحضر الراكب · {rider}',
  'profile.driver.timeline.documentExpired': 'انتهى {document}',
  /* `reason` is operator prose and travels as data — nothing translates what
     somebody wrote. The two bank names are record content for the same reason. */
  'profile.driver.timeline.bankChanged': 'تغيَّر الحساب البنكي · من {from} إلى {to} · {reason}',

  /* ── what else references this captain ────────────────────────────────
     Only the two collections a captain has and a rider does not are here; the
     seven shared labels and all three presence sentences are
     `profile.rider.support.*`, reused. */
  'profile.driver.support.heading': 'في أماكن أخرى من اللوحة',
  'profile.driver.support.safetyIncidents': 'بلاغات السلامة',
  'profile.driver.support.cashReports': 'تقارير النقد',

  /* ── deductions ───────────────────────────────────────────────────── */
  'profile.driver.deductions.heading': 'الخصومات',
  'profile.driver.deductions.empty': 'لا توجد خصومات مسجَّلة على هذا الكابتن.',
  'profile.driver.deduction.meta': '{id} · سُجِّل في {date}',
  'profile.driver.deduction.onTrip': '{id} · سُجِّل في {date} · {trip}',

  /* ── the two navigations, and §11.2's two refusals ────────────────── */
  'profile.driver.action.compliance': 'فتح ملف الالتزامية',
  'profile.driver.action.payouts': 'فتح التحويلات',
  /* **§8.2a / AC-CP-147 — CORRECTED, and the Arabic carried the same wrong
     noun as the English.** It read `الاطلاع على مستندات الكابتن يتطلب صلاحية
     العمليات.` — *documents*, over a list whose expansion is never gated. Only
     the **scan** is ever refused. The shape of the two sentences beside it is
     kept: all three now open with `فتح`, so an operator refused twice on one
     screen is refused in one voice (CM-3). */
  'profile.driver.refusal.viewDocument':
    'فتح النسخ الممسوحة للكابتن يتطلب صلاحية العمليات.',
  'profile.driver.refusal.compliance': 'فتح ملف الالتزامية يتطلب صلاحية العمليات.',
  'profile.driver.refusal.payouts': 'فتح التحويلات يتطلب صلاحية المالية.',
}
