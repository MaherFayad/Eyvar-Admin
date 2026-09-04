/**
 * Fleet compliance — legacy `DB.driverDocs` (`eyvar_ops_panel_v40_fixed.html:13278`),
 * five captains × the three expiring document types, with real ISO expiry dates.

 * ## The document set is four, and compliance tracks three of them
 *
 * The product's documents are **national ID, driving licence, vehicle licence
 * (istimara) and profile photo** — `DOCUMENT_TYPES` in `types/driver.ts`, and
 * nothing else exists. Legacy's inspection certificate, insurance policy and
 * transport-authority operating card are gone from the model, not merely
 * hidden: a type nobody may upload cannot expire, cannot suspend a captain and
 * must not sit in a fixture pretending it can.
 *
 * A **profile photo does not expire**, so it is not a compliance row at all.
 * `COMPLIANCE_DOC_TYPES` is the three that carry a date, which is why
 * `ComplianceDoc.expiresOn` can stay non-nullable — the alternative was a
 * nullable expiry on every row so that one type could opt out of the only
 * question this collection exists to answer.
 *
 * The `state` on each doc is the bucket `docState(days)` computes (`:13291`)
 * against the fixed clock (`2026-06-25`):
 *   `< 0` expired · `≤ 7` critical · `≤ 30` expiring · else valid
 *
 * Legacy computes this at render from `REQ_NOW_REF`, which is the same fixed
 * clock — so the buckets below are the values the legacy app actually shows,
 * not an invention.
 *
 * DRV-0106 and every added captain have **no doc record at all** in legacy: the
 * collection covers 0101–0105 only, so a captain with no compliance file is the
 * normal case and the screen has to say so rather than showing five green pills.
 *
 * ## The document record — provenance and file (this wave)
 *
 * `ComplianceDoc` used to be `{type, expiresOn, state}`, which is the table row
 * and nothing else: a "view document" surface built on it could only re-render
 * the line the operator was already reading. Four fields answer the question
 * they actually open a document to ask — *can I trust this date* — and one
 * answers *is there a scan behind it*. `types/driver.ts` argues each one and
 * lists the fields that were **refused**; this file only has to keep them true.
 *
 * Three rules hold across every row below, and a fixture that breaks one is
 * describing a system that cannot exist:
 *
 *   1. **`application-review` and `auto-default` share one `recordedAt` per
 *      captain** — their approval instant. `approveDriver` creates all five
 *      records in one pass (`:11113`), so five different stamps would mean five
 *      approvals.
 *   2. **`auto-default` ⟹ `expiresOn` is exactly `recordedAt + 1 year`**, and
 *      `recordedByUserId` is `null`. That is the whole mechanism: nobody read a
 *      document, the approval filled the blank with a one-year runway
 *      (`:11111`–`:11113`). Two captains carry one each, and their dates were
 *      **already** a year out from their join month — no seeded expiry moved to
 *      make it fit.
 *   3. **`ops-entry` is stamped after the approval and before the fixed clock**,
 *      and carries the `previousExpiresOn` it replaced — the pair legacy builds
 *      to log the change and then throws away (`:13368`).
 *
 * **There are no bytes and no URLs, anywhere.** `ComplianceDocFile` is the
 * record row, never the object. Legacy's own document viewer says so — a
 * striped rectangle captioned *"Simulated scan preview — full document viewer
 * would render the uploaded file here"* (`:10893`). `file: null` is the common
 * case on purpose — **187 of the 255 documents here** — because a viewer whose
 * empty state is rare is a viewer whose empty state never gets built, and
 * `design/people-captain-profile.md` §6.4 designs for exactly that case first.
 *
 * §6.5 also asked for an `href`. It is refused and the refusal is argued in
 * full on `ComplianceDocFile` in `types/driver.ts`; the short version is that a
 * URL under the mock could only point at a fabricated scan, which §6.4 itself
 * forbids, or at nothing, which reads as a broken system rather than an honest
 * absence.
 *
 * ## What the four states can be exercised with
 *
 * Both halves of every state are reachable, so the viewer can be built and
 * tested against a document that has a scan **and** one that does not:
 *
 * | State | With a file | Without |
 * |---|---|---|
 * | `valid`    | `DRV-0101-license`, `DRV-0201-vehicle_reg` | the majority |
 * | `expiring` | `DRV-0101-vehicle_reg`, `DRV-0102-license` | `DRV-0105-vehicle_reg` |
 * | `critical` | `DRV-0202-id_card`                          | `DRV-0204-id_card` |
 * | `expired`  | `DRV-0104-id_card`                          | `DRV-0202-vehicle_reg` |
 *
 * `DRV-0105` is a fifth case worth naming: three documents, **no scans at all**,
 * so §6.4's sentence is reachable on every row of one captain's file — and
 * `DRV-0203` is the sixth, with no documents at all, which is the list's empty
 * state rather than the viewer's.
 */

import type { IsoDate, IsoDateTime } from '../types/common'
import type {
  ComplianceDocFile,
  ComplianceDocState,
  ComplianceDocType,
  DriverCompliance,
} from '../types/driver'
import { COMPLIANCE_DOC_TYPES } from '../types/driver'
import { cycleRecord } from './cycle'
import { fillerDrivers } from './drivers'

const namedCompliance: DriverCompliance[] = [
  {
    driverId: 'DRV-0101',
    driverName: 'Ahmed Salem',
    vehicle: 'Corolla 2022 · White',
    /* Approved 11 Feb 2025 (`joinedAt: '2025-02-01'` is month-precision, `:52`).
       Three documents still carry that stamp; two have been re-entered since. */
    docs: [
      {
        id: 'DRV-0101-license',
        type: 'license',
        expiresOn: '2027-03-12',
        state: 'valid',
        dateSource: 'application-review',
        recordedAt: '2025-02-11T11:05:00+03:00',
        recordedByUserId: 'USR-1',
        recordedByUserName: 'Sarah Al-Rashid',
        previousExpiresOn: null,
        file: {
          name: 'driving-licence-front.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 1_842_113,
          uploadedAt: '2025-02-10T20:41:00+03:00',
          uploadedByUserId: null,
          uploadedByUserName: 'Ahmed Salem',
        },
      },
      /* 24 days out — `expiring`. Renewed in May and re-entered from Compliance,
         so it carries the year it replaced. The file name is what actually
         arrives from a captain: a WhatsApp export, 92 characters, and it will
         break any column that assumes a file name is short. */
      {
        id: 'DRV-0101-vehicle_reg',
        type: 'vehicle_reg',
        expiresOn: '2026-07-19',
        state: 'expiring',
        dateSource: 'ops-entry',
        recordedAt: '2026-05-12T14:07:00+03:00',
        recordedByUserId: 'USR-5',
        recordedByUserName: 'Yousef Al-Balawi',
        previousExpiresOn: '2025-07-19',
        file: {
          name: 'WhatsApp Image 2026-05-12 at 13.58.04 - istimara front and back scanned copy.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 3_401_772,
          uploadedAt: '2026-05-12T13:58:00+03:00',
          uploadedByUserId: null,
          uploadedByUserName: 'Ahmed Salem',
        },
      },
      {
        id: 'DRV-0101-id_card',
        type: 'id_card',
        expiresOn: '2026-08-02',
        state: 'valid',
        dateSource: 'application-review',
        recordedAt: '2025-02-11T11:05:00+03:00',
        recordedByUserId: 'USR-1',
        recordedByUserName: 'Sarah Al-Rashid',
        previousExpiresOn: null,
        file: null,
      },
      /* The one file an **operator** uploaded rather than the captain — the
         broker emailed the policy and Sarah attached it. `uploadedByUserId`
         non-null is what says so; `LegAcknowledgement.byUserId` sets the
         convention (`types/assurance.ts:75`). */
    ],
    worstState: 'expiring',
    suspendedReason: null,
  },
  {
    driverId: 'DRV-0102',
    driverName: 'Omar Farouk',
    vehicle: 'Camry 2023 · Silver',
    /* Approved 9 Jun 2025. */
    docs: [
      /* 19 days — `expiring`. */
      {
        id: 'DRV-0102-license',
        type: 'license',
        expiresOn: '2026-07-14',
        state: 'expiring',
        dateSource: 'application-review',
        recordedAt: '2025-06-09T10:14:00+03:00',
        recordedByUserId: 'USR-1',
        recordedByUserName: 'Sarah Al-Rashid',
        previousExpiresOn: null,
        file: {
          name: 'IMG_20250608_214417 (1).jpeg',
          mimeType: 'image/jpeg',
          sizeBytes: 4_118_902,
          uploadedAt: '2025-06-08T21:44:00+03:00',
          uploadedByUserId: null,
          uploadedByUserName: 'Omar Farouk',
        },
      },
      /* Re-entered two days **after** the previous one lapsed — the date is
         right and the gap is real. An operator reading `recordedAt` against
         `previousExpiresOn` can see it; nothing else on the screen can. */
      {
        id: 'DRV-0102-vehicle_reg',
        type: 'vehicle_reg',
        expiresOn: '2026-12-01',
        state: 'valid',
        dateSource: 'ops-entry',
        recordedAt: '2025-12-03T16:22:00+03:00',
        recordedByUserId: 'USR-5',
        recordedByUserName: 'Yousef Al-Balawi',
        previousExpiresOn: '2025-12-01',
        file: null,
      },
      {
        id: 'DRV-0102-id_card',
        type: 'id_card',
        expiresOn: '2026-09-10',
        state: 'valid',
        dateSource: 'application-review',
        recordedAt: '2025-06-09T10:14:00+03:00',
        recordedByUserId: 'USR-1',
        recordedByUserName: 'Sarah Al-Rashid',
        previousExpiresOn: null,
        file: null,
      },
      /* 10 days — `expiring`, one bucket above critical. The boundary row, and
         **no scan on record**: the state that matters most, with nothing to
         open. The viewer has to say so rather than show a placeholder. */
    ],
    worstState: 'expiring',
    suspendedReason: null,
  },
  {
    driverId: 'DRV-0103',
    driverName: 'Khalid Mansour',
    vehicle: 'Yaris 2021 · Black',
    /**
     * **The captain who carries an `auto-default`.** Approved 15 Aug 2025, and
     * the Istimara date was left blank on the application — so `approveDriver`
     * filled it with a one-year runway (`:11111`–`:11113`) and it reads
     * `2026-08-15`, which is the seeded value, unchanged.
     *
     * That document is `valid` and **nobody has ever looked at the Istimara.**
     * It is the single most important thing a document viewer can tell an
     * operator, and today the table renders it in the same green as the four
     * dates that were read off paper.
     */
    docs: [
      {
        id: 'DRV-0103-license',
        type: 'license',
        expiresOn: '2028-01-20',
        state: 'valid',
        dateSource: 'application-review',
        recordedAt: '2025-08-15T09:47:00+03:00',
        recordedByUserId: 'USR-1',
        recordedByUserName: 'Sarah Al-Rashid',
        previousExpiresOn: null,
        /* A screenshot of a photo of a licence — 318 KB, a PNG, and the file
           name a phone gives it. Legitimate, ugly, and the reason
           `Photo unclear / blurry` is a rejection reason at all (`:10871`). */
        file: {
          name: 'Screenshot_20250814-223104.png',
          mimeType: 'image/png',
          sizeBytes: 318_774,
          uploadedAt: '2025-08-14T22:31:00+03:00',
          uploadedByUserId: null,
          uploadedByUserName: 'Khalid Mansour',
        },
      },
      /* `2025-08-15` + 1 year, to the day. Nobody typed this. */
      {
        id: 'DRV-0103-vehicle_reg',
        type: 'vehicle_reg',
        expiresOn: '2026-08-15',
        state: 'valid',
        dateSource: 'auto-default',
        recordedAt: '2025-08-15T09:47:00+03:00',
        recordedByUserId: null,
        recordedByUserName: null,
        previousExpiresOn: null,
        file: null,
      },
      /* 30 days exactly — the `expiring` boundary. Off-by-one lives here. */
      {
        id: 'DRV-0103-id_card',
        type: 'id_card',
        expiresOn: '2026-07-25',
        state: 'expiring',
        dateSource: 'application-review',
        recordedAt: '2025-08-15T09:47:00+03:00',
        recordedByUserId: 'USR-1',
        recordedByUserName: 'Sarah Al-Rashid',
        previousExpiresOn: null,
        file: {
          name: 'fahs-certificate-2025.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 96_512,
          uploadedAt: '2025-08-14T18:03:00+03:00',
          uploadedByUserId: null,
          uploadedByUserName: 'Khalid Mansour',
        },
      },
    ],
    worstState: 'expiring',
    suspendedReason: null,
  },
  {
    driverId: 'DRV-0104',
    driverName: 'Hassan Al-Ghamdi',
    vehicle: 'Sonata 2023 · Grey',
    /* Approved 6 Mar 2025. */
    docs: [
      {
        id: 'DRV-0104-license',
        type: 'license',
        expiresOn: '2026-09-30',
        state: 'valid',
        dateSource: 'application-review',
        recordedAt: '2025-03-06T08:52:00+03:00',
        recordedByUserId: 'USR-1',
        recordedByUserName: 'Sarah Al-Rashid',
        previousExpiresOn: null,
        file: null,
      },
      {
        id: 'DRV-0104-vehicle_reg',
        type: 'vehicle_reg',
        expiresOn: '2027-04-11',
        state: 'valid',
        dateSource: 'ops-entry',
        recordedAt: '2026-04-09T10:18:00+03:00',
        recordedByUserId: 'USR-5',
        recordedByUserName: 'Yousef Al-Balawi',
        previousExpiresOn: '2026-04-11',
        file: null,
      },
      /* **Expired five days ago.** A gold-tier captain with 524 trips and 98%
         on-time, driving on a lapsed national ID. The row that
         justifies the §8.4 row-level marker.

         **And it is the one expired document with a scan on record** — which is
         the point: the file is the *old* card, uploaded in March 2025 and
         accurate for the year it covered. A viewer that shows it without the
         expiry beside it is showing an operator a valid-looking document for a
         car that should not be on the road. `uploadedAt` is what stops that. */
      {
        id: 'DRV-0104-id_card',
        type: 'id_card',
        expiresOn: '2026-06-20',
        state: 'expired',
        dateSource: 'application-review',
        recordedAt: '2025-03-06T08:52:00+03:00',
        recordedByUserId: 'USR-1',
        recordedByUserName: 'Sarah Al-Rashid',
        previousExpiresOn: null,
        file: {
          name: 'fahs.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 2_204_881,
          uploadedAt: '2025-03-05T19:12:00+03:00',
          uploadedByUserId: null,
          uploadedByUserName: 'Hassan Al-Ghamdi',
        },
      },
    ],
    worstState: 'expired',
    suspendedReason: null,
  },
  {
    driverId: 'DRV-0105',
    driverName: 'Youssef Nouri',
    vehicle: 'Sunny 2020 · White',
    /**
     * **A complete file with nothing to open.** Approved 14 Oct 2025; three
     * dates, zero scans. Every other captain has at least one file, so this row
     * is the one that proves the viewer's empty state is reachable from the
     * *profile* and not only from a single document — and it is the ordinary
     * case, because `DB.driverDocs` never held a file at all.
     *
     * The national ID is the second `auto-default`: `2025-10-14` + 1 year to
     * the day, seeded value unchanged, `valid`, and nobody read the card.
     */
    docs: [
      {
        id: 'DRV-0105-license',
        type: 'license',
        expiresOn: '2027-06-18',
        state: 'valid',
        dateSource: 'application-review',
        recordedAt: '2025-10-14T12:33:00+03:00',
        recordedByUserId: 'USR-5',
        recordedByUserName: 'Yousef Al-Balawi',
        previousExpiresOn: null,
        file: null,
      },
      /* 13 days. */
      {
        id: 'DRV-0105-vehicle_reg',
        type: 'vehicle_reg',
        expiresOn: '2026-07-08',
        state: 'expiring',
        dateSource: 'application-review',
        recordedAt: '2025-10-14T12:33:00+03:00',
        recordedByUserId: 'USR-5',
        recordedByUserName: 'Yousef Al-Balawi',
        previousExpiresOn: null,
        file: null,
      },
      {
        id: 'DRV-0105-id_card',
        type: 'id_card',
        expiresOn: '2026-10-14',
        state: 'valid',
        dateSource: 'auto-default',
        recordedAt: '2025-10-14T12:33:00+03:00',
        recordedByUserId: null,
        recordedByUserName: null,
        previousExpiresOn: null,
        file: null,
      },
    ],
    worstState: 'expiring',
    suspendedReason: null,
  },

  /* ── added rows ─────────────────────────────────────────────────────── */
  {
    driverId: 'DRV-0202',
    driverName: 'Majed Al-Shamrani',
    vehicle: 'Accent 2019 · Silver',
    /* Approved 17 Apr 2025. */
    docs: [
      {
        id: 'DRV-0202-license',
        type: 'license',
        expiresOn: '2027-08-04',
        state: 'valid',
        dateSource: 'application-review',
        recordedAt: '2025-04-17T09:05:00+03:00',
        recordedByUserId: 'USR-1',
        recordedByUserName: 'Sarah Al-Rashid',
        previousExpiresOn: null,
        file: {
          name: 'licence-scan.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 612_004,
          uploadedAt: '2025-04-16T13:20:00+03:00',
          uploadedByUserId: null,
          uploadedByUserName: 'Majed Al-Shamrani',
        },
      },
      /**
       * **Expired a week ago and the captain is suspended for it.** The one row
       * where compliance has already acted.
       *
       * **And there is no file.** A captain is off dispatch on the strength of a
       * date somebody typed fourteen months ago, and there is nothing in the
       * record to check it against. That is not a gap in the fixture — it is the
       * state legacy actually ships, and it is exactly why a viewer that
       * fabricated a scan would be dangerous rather than merely wrong.
       */
      {
        id: 'DRV-0202-vehicle_reg',
        type: 'vehicle_reg',
        expiresOn: '2026-06-18',
        state: 'expired',
        dateSource: 'application-review',
        recordedAt: '2025-04-17T09:05:00+03:00',
        recordedByUserId: 'USR-1',
        recordedByUserName: 'Sarah Al-Rashid',
        previousExpiresOn: null,
        file: null,
      },
      /* An 8.9 MB photograph straight off a phone, with the extension a handset
         leaves behind when it transcodes. The `critical` document that has
         something to open. */
      {
        id: 'DRV-0202-id_card',
        type: 'id_card',
        expiresOn: '2026-06-30',
        state: 'critical',
        dateSource: 'ops-entry',
        recordedAt: '2025-07-02T14:19:00+03:00',
        recordedByUserId: 'USR-5',
        recordedByUserName: 'Yousef Al-Balawi',
        previousExpiresOn: '2025-06-30',
        file: {
          name: 'IMG_2291.HEIC.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 8_912_344,
          uploadedAt: '2025-07-02T14:11:00+03:00',
          uploadedByUserId: null,
          uploadedByUserName: 'Majed Al-Shamrani',
        },
      },
    ],
    worstState: 'expired',
    suspendedReason: 'Vehicle licence (istimara) expired 7 days ago',
  },
  {
    driverId: 'DRV-0201',
    driverName: 'عبد الرحمن بن محمد بن عبد الله آل عبد الله القحطاني الدوسري',
    vehicle: 'Hyundai Azera 2024 · Pearl White Metallic',
    /* Everything valid and far out — the all-clear row, so the screen has a
       "nothing to do here" case beside the four that need work.

       **Two of the three files carry Arabic names**, one with Arabic-Indic
       digits. A file name is data, never copy: it is not translated, it is not
       transliterated, and it renders in whichever script it was saved in — which
       makes it the hardest bidi case on the surface, sitting inside an otherwise
       Latin metadata block. Seeded here rather than left for production. */
    docs: [
      {
        id: 'DRV-0201-license',
        type: 'license',
        expiresOn: '2029-05-30',
        state: 'valid',
        dateSource: 'ops-entry',
        recordedAt: '2024-11-20T13:02:00+03:00',
        recordedByUserId: 'USR-1',
        recordedByUserName: 'Sarah Al-Rashid',
        previousExpiresOn: '2024-11-30',
        file: {
          name: 'رخصة-القيادة-تجديد-٢٠٢٩.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 431_990,
          uploadedAt: '2024-11-20T12:55:00+03:00',
          uploadedByUserId: null,
          uploadedByUserName: 'عبد الرحمن بن محمد بن عبد الله آل عبد الله القحطاني الدوسري',
        },
      },
      /* 11 MB. Whatever a viewer does about size, it has to do it for this row. */
      {
        id: 'DRV-0201-vehicle_reg',
        type: 'vehicle_reg',
        expiresOn: '2028-02-14',
        state: 'valid',
        dateSource: 'application-review',
        recordedAt: '2024-11-12T09:26:00+03:00',
        recordedByUserId: 'USR-1',
        recordedByUserName: 'Sarah Al-Rashid',
        previousExpiresOn: null,
        file: {
          name: 'استمارة السيارة - الوجه الأمامي والخلفي.jpeg',
          mimeType: 'image/jpeg',
          sizeBytes: 11_204_667,
          uploadedAt: '2024-11-11T17:38:00+03:00',
          uploadedByUserId: null,
          uploadedByUserName: 'عبد الرحمن بن محمد بن عبد الله آل عبد الله القحطاني الدوسري',
        },
      },
      {
        id: 'DRV-0201-id_card',
        type: 'id_card',
        expiresOn: '2027-09-01',
        state: 'valid',
        dateSource: 'application-review',
        recordedAt: '2024-11-12T09:26:00+03:00',
        recordedByUserId: 'USR-1',
        recordedByUserName: 'Sarah Al-Rashid',
        previousExpiresOn: null,
        file: null,
      },
      /* 14 KB — small enough that it is probably a thumbnail rather than the
         document. Nothing in the record can tell an operator that, which is a
         finding and not a fixture bug. */
    ],
    worstState: 'valid',
    suspendedReason: null,
  },
  {
    driverId: 'DRV-0203',
    driverName: 'Faisal Al-Amri',
    vehicle: 'Elantra 2024 · Blue',
    /**
     * **No documents on file at all.** Approved yesterday; the compliance
     * record has not been created. This is the *filtered-to-zero vs first-run*
     * distinction from R8 in one row: the captain exists, the file does not.
     * It is also the normal case for every captain outside 0101–0105 in the
     * legacy data.
     *
     * Note the two absences are different and both are reachable: **this** row
     * has no documents, `DRV-0105` has five documents and no scans.
     */
    docs: [],
    /* `null`, not `valid`. Reporting a captain with no file as compliant is the
       most dangerous default this screen could have. */
    worstState: null,
    suspendedReason: null,
  },
  {
    /**
     * **The first captain whose `worstState` is `critical`.**
     *
     * `critical` existed at document level — `DRV-0202` carries two — but that
     * captain's operating card is *expired*, so their worst is `expired` and
     * the `critical` **row** badge had never rendered. A state that exists on a
     * child and never on the parent is invisible: the index shows one badge per
     * captain, the filter facets on `worstState`, and the sort orders by it.
     *
     * The distinction is the entire point of the bucket. `expired` means the
     * captain should not be driving today. `critical` means they will be
     * illegal within the week and **nothing has happened yet** — it is the only
     * bucket where an operator can still act in time, which is why it needs to
     * be reachable more than any of the other three.
     *
     * Six days out on the vehicle licence, seven on the national ID: the `≤ 7`
     * boundary from `docState` (`:13291`) sits on that second document, so this
     * row also pins the off-by-one.
     */
    driverId: 'DRV-0204',
    driverName: 'Turki Al-Mutairi',
    vehicle: 'Sunny 2021 · White',
    /* Approved 8 Sep 2025. */
    docs: [
      {
        id: 'DRV-0204-license',
        type: 'license',
        expiresOn: '2027-11-02',
        state: 'valid',
        dateSource: 'application-review',
        recordedAt: '2025-09-08T11:41:00+03:00',
        recordedByUserId: 'USR-5',
        recordedByUserName: 'Yousef Al-Balawi',
        previousExpiresOn: null,
        file: null,
      },
      /* 6 days. */
      {
        id: 'DRV-0204-vehicle_reg',
        type: 'vehicle_reg',
        expiresOn: '2026-07-01',
        state: 'critical',
        dateSource: 'application-review',
        recordedAt: '2025-09-08T11:41:00+03:00',
        recordedByUserId: 'USR-5',
        recordedByUserName: 'Yousef Al-Balawi',
        previousExpiresOn: null,
        file: null,
      },
      /* 7 days exactly — the `critical` boundary. */
      {
        id: 'DRV-0204-id_card',
        type: 'id_card',
        expiresOn: '2026-07-02',
        state: 'critical',
        dateSource: 'application-review',
        recordedAt: '2025-09-08T11:41:00+03:00',
        recordedByUserId: 'USR-5',
        recordedByUserName: 'Yousef Al-Balawi',
        previousExpiresOn: null,
        file: null,
      },
    ],
    worstState: 'critical',
    suspendedReason: null,
  },
]

/* ── volume ──────────────────────────────────────────────────────────── */

/**
 * The expiring types, in the order the domain reads them — taken from
 * `COMPLIANCE_DOC_TYPES` rather than restated.
 *
 * It used to be a fourth copy of the same strings. It could not read the
 * constant while the constant carried English labels; now that it carries
 * `labelKey`, the order has one home.
 */
const DOC_TYPES = COMPLIANCE_DOC_TYPES.map((t) => t.key)

/**
 * `docState(days)` (`:13291`), verbatim: `< 0` expired · `≤ 7` critical ·
 * `≤ 30` expiring · else valid.
 *
 * Written out here rather than reused from a client because the `state` on a
 * document is a **stored** field — the server buckets it once so three screens
 * cannot bucket it three ways — and a fixture that computed it at read time
 * would be modelling a different contract from the one the type declares.
 */
function docStateFor(daysOut: number): ComplianceDocState {
  if (daysOut < 0) return 'expired'
  if (daysOut <= 7) return 'critical'
  if (daysOut <= 30) return 'expiring'
  return 'valid'
}

/** `2026-06-25` plus `daysOut`, as a bare date. No host clock; the base is the fixed one. */
function expiryFor(daysOut: number): IsoDate {
  const d = new Date(Date.UTC(2026, 5, 25) + daysOut * 86_400_000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`
}

/** `date` shifted by whole days. Deterministic — parses an explicit instant, never reads a host clock. */
function addDays(date: IsoDate, days: number): IsoDate {
  const d = new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`
}

/** A Riyadh instant on `date`. Minutes come from the row so two rows are not identical by accident. */
function instantOn(date: IsoDate, hour: number, minute: number): IsoDateTime {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${date}T${p(hour)}:${p(minute)}:00+03:00`
}

/** The later of two ISO values, lexicographically — same offset on both, so string order is time order. */
function laterOf(a: IsoDateTime, b: IsoDateTime): IsoDateTime {
  return a > b ? a : b
}

const WORST_ORDER: readonly ComplianceDocState[] = ['expired', 'critical', 'expiring', 'valid']

/**
 * Filler file names, one per document type. Boring on purpose — the ugly ones
 * are hand-written above, on captains an operator will actually open.
 *
 * Keyed by `ComplianceDocType` rather than indexed by slot: an index would be
 * `possibly undefined` under `noUncheckedIndexedAccess`, and a `Record` also
 * fails to compile the day a fourth expiring type is added, which is the point.
 */
const FILLER_FILES: Readonly<
  Record<ComplianceDocType, Pick<ComplianceDocFile, 'name' | 'mimeType' | 'sizeBytes'>>
> = {
  /* A PNG on purpose: `complianceScan.test.ts` §4 needs two seeded documents of
     every media type, and the national ID is the one an applicant photographs
     with a handset that writes PNG. Losing the operating card's PNG to the
     four-document set would otherwise have left one media type unreachable. */
  id_card: { name: 'national-id.png', mimeType: 'image/png', sizeBytes: 894_112 },
  license: { name: 'licence.jpg', mimeType: 'image/jpeg', sizeBytes: 1_204_336 },
  vehicle_reg: { name: 'istimara-scan.pdf', mimeType: 'application/pdf', sizeBytes: 287_004 },
}

/**
 * Volume for the Compliance view — 43 more captains, so it pages and its
 * `worstState` filter has a population to divide.
 *
 * **The captain and their vehicle come off one `Driver` record.** A compliance
 * row denormalises three fields — id, name, vehicle — and reading them from the
 * canonical captain is the same rule the trip and subscription fillers now
 * follow. A compliance file describing a car the captain does not drive is a
 * dispute waiting to happen.
 *
 * `worstState` is **derived from the documents rather than asserted**, so a row
 * cannot claim a badge its own dates deny — which is exactly the defect that
 * kept `critical` unreachable at row level.
 *
 * ## The volume carries no `auto-default`, deliberately
 *
 * An auto-defaulted expiry is `approval + 1 year` **by construction**
 * (`:11111`–`:11113`), so seeding one means either moving a captain's expiry to
 * land a year after their join month, or shipping a row whose own two fields
 * contradict each other. Neither is worth doing to 43 rows nobody opens. The
 * two `auto-default` documents are hand-written above, on `DRV-0103` and
 * `DRV-0105`, where the arithmetic was already exact and **no seeded date
 * moved**.
 *
 * The volume does carry both other sources and a spread of files, so a filter
 * on `dateSource` or a count of missing scans has a population to divide.
 */
export const fillerCompliance: DriverCompliance[] = Array.from({ length: 43 }, (_, i) => {
  const captain = cycleRecord(fillerDrivers, i)
  /* One approval instant per captain — `approveDriver` writes every record in
     one pass (`:11113`), so every `application-review` row shares this. */
  const approvedAt = instantOn(captain.joinedAt, 9, (i * 7) % 60)
  const docs = DOC_TYPES.map((type, d) => {
    /**
     * One document in roughly six is inside thirty days; the rest are months
     * out. The offsets are a pure function of the row and the slot, so the
     * distribution is fixed and a snapshot can be diffed.
     *
     * **Never negative, and that is a constraint from another file.**
     * `fixtures/navCounts.ts` pins `operations-people` to *applications waiting
     * + captains with a lapsed document*, and `navCounts.test.ts` asserts the
     * lapsed half is exactly 2 — `DRV-0104`'s national ID and `DRV-0202`'s
     * vehicle licence, both hand-written and both argued for by name. A filler
     * that expired a document would move a badge three files reason about and
     * would drown the two rows the count is *about*. So the volume reaches
     * `critical` and `expiring` and stops there; `expired` stays the property
     * of the two captains who earned it.
     */
    const daysOut = (i + d) % 6 === 0 ? ((i * 7 + d * 13) % 40) + 1 : 45 + ((i * 29 + d * 41) % 900)
    /* Roughly one document in three has been re-entered from Compliance since
       approval; the rest still carry the date typed on the application. */
    const reEntered = (i * 3 + d) % 3 === 0
    /* Clamped to the day **after** the approval — a correction cannot predate
       the record it corrects, and it cannot land on the same instant either:
       that would be a re-entry of a date nobody had typed yet. The filler's
       join months span a whole year, so the clamp does real work. */
    const recordedAt = reEntered
      ? laterOf(
          instantOn(expiryFor(-(20 + ((i * 13 + d * 7) % 300))), 10, (i + d * 11) % 60),
          instantOn(addDays(captain.joinedAt, 1), 10, (i + d * 11) % 60),
        )
      : approvedAt
    const hasFile = (i * 3 + d) % 4 === 0
    const spec = FILLER_FILES[type]
    return {
      id: `${captain.id}-${type}`,
      type,
      expiresOn: expiryFor(daysOut),
      state: docStateFor(daysOut),
      dateSource: reEntered ? ('ops-entry' as const) : ('application-review' as const),
      recordedAt,
      /* Only two operators hold `approve_drivers`, which is what legacy gates
         both date writers on (`:11033`, `:13365`). Nobody else can appear here. */
      recordedByUserId: (i + d) % 2 === 0 ? 'USR-1' : 'USR-5',
      recordedByUserName: (i + d) % 2 === 0 ? 'Sarah Al-Rashid' : 'Yousef Al-Balawi',
      previousExpiresOn: reEntered ? expiryFor(daysOut - 365) : null,
      file: hasFile
        ? {
            name: spec.name,
            mimeType: spec.mimeType,
            sizeBytes: spec.sizeBytes,
            uploadedAt: recordedAt,
            /* One in nine was uploaded by an operator on the captain's behalf. */
            uploadedByUserId: (i + d) % 9 === 0 ? 'USR-5' : null,
            uploadedByUserName: (i + d) % 9 === 0 ? 'Yousef Al-Balawi' : captain.name,
          }
        : null,
    }
  })
  const worstState =
    WORST_ORDER.find((state) => docs.some((doc) => doc.state === state)) ?? null
  return {
    driverId: captain.id,
    driverName: captain.name,
    vehicle: captain.vehicle,
    docs,
    worstState,
    /* Nobody in the filler population is suspended — `fillerDrivers` are all
       `status: 'active'`, and a suspension reason here without one there would
       be two records disagreeing about the same captain. */
    suspendedReason: null,
  } satisfies DriverCompliance
})

/** 52 rows — nine hand-written captains and forty-three of fleet. */
export const complianceFixtures: DriverCompliance[] = [...namedCompliance, ...fillerCompliance]
