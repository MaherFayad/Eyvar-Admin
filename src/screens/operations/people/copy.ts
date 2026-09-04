/**
 * Operations › People — every operator-facing string this screen can render,
 * as keys (**AC-74**), with no concatenation anywhere (**AC-75**).
 *
 * **Why the strings live here and not in `src/i18n/dictionaries.ts`.** That
 * file has a single owner and thirty-three more screens are coming. A screen
 * owns its own copy, exports it as a `Dictionary`, and the dictionary module
 * merges it in one line — so adding a screen never edits another screen's
 * strings. `dictionaries.ts` carries exactly one import and one spread for
 * this file; that is the whole change to a file I do not own.
 *
 * Rules applied (`docs/ref/copy.md`)
 *   1  sentence case everywhere; only proper nouns capitalised mid-string.
 *   2  buttons are verbs. `Cancel` is the one permitted non-verb here.
 *   4  errors are imperatives naming the fix — no "please", no "invalid",
 *      no "failed", no blame (**AC-39**).
 *   6  "you" / "your": the operator is addressed directly.
 *   8  no period on a toast, badge or menu item; banner and empty-state
 *      SENTENCES take one (R6).
 *   9  a destructive confirmation says what will NOT change.
 *  10  end-of-list and no-data are stated in words.
 *
 * **Counts get two keys, never a plural engine** (`translate.ts` header:
 * Arabic has six plural categories and a half-built engine is worse than an
 * explicit choice). Every `*.one` / `*.other` pair below is that choice.
 */

import type { Dictionary } from '@/lib'

export const PEOPLE_EN: Dictionary = {
  /* ── page ───────────────────────────────────────────────────────────── */
  'people.title': 'People',

  /* §8's metadata line (V4) — the count of what is on screen, one key per
     noun, singular and plural chosen by the caller. */
  'people.meta.captains.one': '1 captain',
  'people.meta.captains.other': '{count} captains',
  'people.meta.applications.one': '1 application',
  'people.meta.applications.other': '{count} applications',
  'people.meta.compliance.one': '1 compliance file',
  'people.meta.compliance.other': '{count} compliance files',
  'people.meta.riders.one': '1 rider',
  'people.meta.riders.other': '{count} riders',

  /* ── column headers (§9.1 — 12px/500, no uppercase, D18) ────────────── */
  'people.col.captain': 'Captain',
  'people.col.applicant': 'Applicant',
  'people.col.rider': 'Rider',
  'people.col.id': 'ID',
  'people.col.status': 'Status',
  'people.col.tier': 'Tier',
  'people.col.city': 'City',
  'people.col.class': 'Class',
  'people.col.vehicle': 'Vehicle',
  'people.col.phone': 'Phone',
  'people.col.subs': 'Subs',
  'people.col.trips': 'Trips',
  'people.col.onTime': 'On time',
  'people.col.earned': 'Earned (SAR)',
  'people.col.lastTrip': 'Last trip',
  'people.col.soonestExpiry': 'Next expiry',
  'people.col.joined': 'Joined',
  'people.col.rating': 'Rating',
  'people.col.wallet': 'Wallet (SAR)',
  'people.col.ltv': 'Lifetime (SAR)',
  'people.col.renewal': 'Renewal',
  'people.col.quickRides': 'Quick rides',
  'people.col.churn': 'Churn risk',
  'people.col.applied': 'Applied',
  /* §13.3 — the Applications identity's second line (§7.7). One key, because
     `Applied` + a date is a sentence fragment and joining it in code is exactly
     what AC-75 forbids. */
  'people.applied': 'Applied {date}',
  'people.col.complaints': 'Open complaints',
  'people.col.sla': 'SLA',
  'people.col.owner': 'Owner',
  'people.col.decision': 'Decision',
  'people.col.plate': 'Plate',
  'people.col.docs': 'Documents',
  'people.col.dispatch': 'Dispatch',
  /* **The product's four documents and nothing else** — `DOCUMENT_TYPES` in
     `types/driver.ts` is the enum, these are its words. The inspection
     certificate, the insurance policy and the operating card were removed from
     the model, so their keys are gone rather than merely unused. */
  'people.col.doc.nationalId': 'National ID',
  'people.col.doc.license': 'Driving licence',
  'people.col.doc.vehicleReg': 'Vehicle licence',
  'people.col.doc.photo': 'Profile photo',

  /* ── domain labels ──────────────────────────────────────────────────── */
  /* R7 tones live in code; the WORD lives here, because §7.5 forbids colour
     as the only carrier and the word is what survives greyscale. */
  'people.driverStatus.active': 'Active',
  'people.driverStatus.underReview': 'Under review',
  'people.driverStatus.suspended': 'Suspended',
  'people.driverStatus.pending': 'Pending',

  'people.riderStatus.subscriber': 'Subscriber',
  'people.riderStatus.onDemand': 'On demand',

  'people.applicantStatus.pending': 'Pending',
  'people.applicantStatus.inReview': 'In review',
  'people.applicantStatus.approved': 'Approved',
  'people.applicantStatus.rejected': 'Rejected',
  'people.applicantStatus.withdrawn': 'Withdrawn',

  'people.tier.gold': 'Gold',
  'people.tier.silver': 'Silver',
  'people.tier.standard': 'Standard',
  'people.tier.bronze': 'Bronze',
  'people.tier.new': 'New',

  'people.churn.low': 'Low',
  'people.churn.medium': 'Medium',
  'people.churn.high': 'High',

  'people.class.economy': 'Economy',
  'people.class.comfort': 'Comfort',

  /* Compliance document buckets. `{days}d` is the legacy label (`:13291`)
     and it is a fragment, so it takes no period. */
  'people.doc.daysLeft': '{days}d',
  'people.doc.expired': 'Expired',

  /* `04-index-screen-redesign.md` §13.3 — the derived Compliance cells. Every
     one is PLAIN TEXT (§9.2): five per-document badge columns collapse into
     `people.docs.summary`, and 33 computed day counts stop being badges. Each
     is one key with named placeholders; nothing here concatenates (AC-75). */
  'people.docs.summary': '{valid} of {total} valid',
  'people.docs.expired': '{n} expired',
  'people.docs.expiring': 'Expires in {days}d',
  'people.docs.valid': 'Valid · {days}d',
  'people.expiry.cell': '{date} · {days}d',
  /* §13.3 has no variant for a document already past its date, and `{days}d`
     renders `-7d` there — arithmetic leaking into copy. Raised as a finding;
     this is the key the cell uses meanwhile. */
  'people.expiry.cellExpired': '{date} · expired',
  'people.doc.expiresOn': 'Expires {date}',
  'people.doc.none': 'No file',
  'people.doc.noneOnFile': 'No documents on file',
  'people.dispatch.active': 'Active',
  'people.dispatch.suspended': 'Suspended',
  'people.compliance.worst.valid': 'All valid',
  'people.compliance.worst.expiring': 'Expiring',
  'people.compliance.worst.critical': 'Expiring',
  'people.compliance.worst.expired': 'Expired',
  'people.compliance.worst.none': 'No file',

  /* Two integers, never the legacy `'4/5'` string (`types/driver.ts`). */
  'people.subsOfMax': '{used} / {max}',
  'people.percent': '{value}%',
  'people.ratingNew': 'New',

  /* ── toolbar ────────────────────────────────────────────────────────── */
  'people.search.captains': 'Search captains',
  'people.search.applications': 'Search applications',
  'people.search.compliance': 'Search compliance',
  'people.search.riders': 'Search riders',
  'people.toolbar.openSearch': 'Search this view',
  'people.toolbar.filter': 'Filter',
  'people.toolbar.columns': 'Choose columns',
  'people.toolbar.sort': 'Sort',
  'people.sort.ascending': 'Ascending',
  'people.sort.descending': 'Descending',
  'people.sort.direction': 'Direction',
  'people.columns.title': 'Columns',
  'people.columns.locked': 'The identity column always shows',
  'people.columns.reset': 'Reset columns',
  'people.filter.add': 'Add filter',
  'people.filter.any': 'Any',
  'people.filter.remove': 'Remove the {field} filter',
  'people.filter.field.status': 'Status',
  'people.filter.field.tier': 'Tier',
  'people.filter.field.vehicleClass': 'Class',
  'people.filter.field.churnRisk': 'Churn risk',
  'people.filter.field.worstState': 'Document state',
  'people.filter.field.suspended': 'Dispatch',
  'people.filter.field.applicantStatus': 'Status',
  'people.filter.field.corporateAccount': 'Company account',
  'people.filter.value.claimed': 'Claimed',
  'people.filter.value.suspended.true': 'Suspended',
  'people.filter.value.suspended.false': 'Active',
  'people.filter.chip': '{field}: {value}',

  /* §9.4 — a queue scope that is a VIEW, not a filter chip. Named separately
     so the operator can clear it from the same row the chips live in. */
  'people.scope.breached': 'Past SLA only',
  'people.scope.clear': 'Show every application',

  /* ── row and bulk actions ───────────────────────────────────────────── */
  'people.action.viewProfile': 'Open 360° profile',
  /* §13.4 — the one-word form, for a row action rendered as a BUTTON rather
     than as a menu item (D8, §7.8). A menu item can afford five words; an 88px
     lane cannot. */
  'people.action.view': 'View',
  'people.action.openApplication': 'Open application',
  'people.action.suspend': 'Suspend captain',
  'people.action.reinstate': 'Reinstate captain',
  'people.action.viewCompliance': 'Open compliance file',
  'people.action.noPermission':
    'You cannot decide applications or suspend captains. Ask an Owner for the “Captain applications” permission.',
  'people.bulk.suspend': 'Suspend',
  'people.bulk.reinstate': 'Reinstate',

  /* §11.2 / **AC-368** — the second clause. A disabled action owes the operator
     a sentence, and `rowActions.tsx` renders it as real text beside the dead
     control, never as a tooltip. `people.action.noPermission` above is the
     third refusal and already existed; these two are the domain-state ones,
     added with `src/commands/captains.ts` (D9, C-1) because until the registry
     existed the row menu disabled `Suspend` with no explanation at all.

     Two keys per refusal, singular and plural, and the plural counts the
     BLOCKED subset rather than the selection — "3 of the selected captains"
     tells the operator how much of what they picked is the problem. */
  'people.action.suspend.blocked.one': 'This captain is already suspended.',
  'people.action.suspend.blocked.other':
    '{count} of the selected captains are already suspended.',
  'people.action.reinstate.blocked.one': 'This captain is not suspended.',
  'people.action.reinstate.blocked.other':
    '{count} of the selected captains are not suspended.',

  /* **D21's third sentence.** `.one` and `.other` above are unchanged and are
     the strings the ruling quotes verbatim; these are the case they cannot
     cover. `3 of the selected captains are already suspended` is TRUE of a
     3-of-3 selection and invites the operator to deselect a few and try again,
     when there is nothing to deselect to — so an all-blocked selection gets its
     own sentence, and `DataTable` offers no `Select only…` control beside it
     (**AC-960**). */
  'people.action.suspend.blocked.all': 'All {count} selected captains are already suspended.',
  'people.action.reinstate.blocked.all': 'None of the {count} selected captains is suspended.',

  /* §9.1 — the confirmation states the VERB and the COUNT, the body states
     the consequence AND what will not change, the primary repeats the verb.
     Never `OK`, `Yes`, `Confirm` or `Submit`. Blue, not red: a suspension is
     recoverable, and R5a spends red only on the unrecoverable. */
  'people.confirm.suspend.title.one': 'Suspend 1 captain?',
  'people.confirm.suspend.title.other': 'Suspend {count} captains?',
  'people.confirm.suspend.body':
    'They come off dispatch straight away and keep their trips, earnings and subscriptions. You can reinstate them at any time.',
  'people.confirm.suspend.reason': 'Reason',
  'people.confirm.suspend.reasonHelp': 'The captain sees this, so name what they need to fix.',
  'people.confirm.suspend.confirm': 'Suspend captains',
  'people.confirm.reinstate.title.one': 'Reinstate 1 captain?',
  'people.confirm.reinstate.title.other': 'Reinstate {count} captains?',
  'people.confirm.reinstate.body':
    'They go back on dispatch straight away. Their compliance documents and open complaints are unchanged.',
  'people.confirm.reinstate.confirm': 'Reinstate captains',
  'people.confirm.cancel': 'Cancel',

  'people.reject.title': 'Reject {name}?',
  'people.reject.body':
    'The application closes and the applicant is told why. Their documents stay on file, and they can apply again.',
  'people.reject.reason': 'Reason',
  'people.reject.reasonHelp': 'The applicant sees this, so name what they need to fix.',
  'people.reject.confirm': 'Reject application',

  'people.takeOver.title': 'Take this application from {name}?',
  'people.takeOver.body':
    '{name} loses it without being asked, and the take-over is recorded. Nothing they have already decided changes.',
  'people.takeOver.confirm': 'Take over',

  /* ── toasts (R9: one line, names the object, ≤60 chars, no period) ──── */
  'people.toast.suspended.one': 'Captain suspended',
  'people.toast.suspended.other': '{count} captains suspended',
  'people.toast.reinstated.one': 'Captain reinstated',
  'people.toast.reinstated.other': '{count} captains reinstated',
  'people.toast.claimed': 'Application claimed',
  'people.toast.released': 'Application released',
  'people.toast.takenOver': 'Application taken over',
  'people.toast.approved': 'Application approved',
  'people.toast.rejected': 'Application rejected',

  /* ── work queue (§9.3, R5a) ─────────────────────────────────────────── */
  'people.queue.banner.one': '1 application is past its SLA.',
  'people.queue.banner.other': '{count} applications are past their SLA.',
  'people.queue.showBreached': 'Show only breached',
  'people.queue.claim': 'Claim',
  'people.queue.release': 'Release',
  'people.queue.takeOver': 'Take over',
  /* Owner chip, three states (§8.4.1, V-06). No emoji — the legacy `✋` is
     dropped (**AC-76**). */
  'people.queue.owner.mine': 'Yours · {duration}',
  'people.queue.owner.unclaimed': 'Unclaimed',
  'people.queue.approve': 'Approve',
  'people.queue.reject': 'Reject',
  /* A decided row converts IN PLACE: outcome, actor and reason, timestamp
     beneath. A rejection is NEUTRAL with a word, never red (V-07, R5). */
  'people.queue.decided.approved': 'Approved',
  'people.queue.decided.rejected': 'Rejected',
  'people.queue.decided.withdrawn': 'Withdrawn',
  /* Actor and timestamp in ONE key with two placeholders — never two
     translated fragments joined with a separator (**AC-75**). */
  'people.queue.decided.by': '{actor} · {date}',
  'people.queue.decided.byApplicant': 'The applicant · {date}',
  'people.queue.docsVerified': '{verified} of {total} verified',

  /* ── the four states, per view (§11.1, §11.2, R8) ───────────────────── */
  /* `first-run` names the VALUE of the section, never the absence of data. */
  'people.empty.captains.heading': 'Every captain, from application to compliance',
  'people.empty.captains.body':
    'Add a captain to start reviewing documents, tracking readiness, and assigning trips.',
  'people.empty.captains.primary': 'Add captain',
  'people.empty.captains.secondary': 'Import captains',
  'people.empty.captains.noMatch': 'No captains match these filters.',

  'people.empty.applications.heading': 'Applications arrive here for review',
  'people.empty.applications.body':
    'Every captain who applies lands in this queue with their documents, so you can approve or reject in one place.',
  'people.empty.applications.primary': 'Invite a captain to apply',
  'people.empty.applications.noMatch': 'No applications match these filters.',

  'people.empty.compliance.heading': 'Document expiry, for the whole fleet',
  'people.empty.compliance.body':
    'Once a captain has a compliance file you can see every expiry date here and act before dispatch is affected.',
  'people.empty.compliance.primary': 'Add a compliance file',
  'people.empty.compliance.noMatch': 'No compliance files match these filters.',

  'people.empty.riders.heading': 'The rider roster, with wallets and renewals',
  'people.empty.riders.body':
    'Riders appear here as soon as they register, with their wallet balance, subscriptions and churn risk.',
  'people.empty.riders.primary': 'Invite riders',
  'people.empty.riders.noMatch': 'No riders match these filters.',

  'people.error.captains': "Couldn't load captains.",
  'people.error.applications': "Couldn't load applications.",
  'people.error.compliance': "Couldn't load compliance files.",
  'people.error.riders': "Couldn't load riders.",
  /* §11.2 `row` scope — replaces that row's action cell only; every other row
     stays interactive (**AC-41**). */
  'people.error.row.suspend': "Couldn't suspend this captain.",
  'people.error.row.reinstate': "Couldn't reinstate this captain.",
  'people.error.row.claim': "Couldn't claim this application.",
  'people.error.row.release': "Couldn't release this application.",
  'people.error.row.approve': "Couldn't approve this application.",
  'people.error.row.reject': "Couldn't reject this application.",
  'people.error.retry': 'Try again',

  /* Accessible names. Every one is a full key with a placeholder (AC-75). */
  'people.a11y.rowActions': 'More actions for {name}',
  'people.a11y.openProfile': 'Open the 360° profile for {name}',
  'people.a11y.selectRow': 'Select {name}',

  /* Moved out of JSX `defaultValue` literals, 2026-09-02. A `defaultValue`
     resolves as a third fallback the missing-key guard never sees
     (`lib/i18n/translate.ts:98`), so these strings were invisible to an
     extractor AND to the copy tests -- an unaudited copy surface, not just
     an untranslatable one.

     **They were relocated, then rewritten** (`docs/ref/copy.md`), because
     relocating an unaudited string only makes it visible; it does not make it
     conform. Eleven were Title Case (`Phone Number`, `Operating City`,
     `Vehicle & Class Specification`) -- rule 1 -- and two opened with
     `Failed to`, which rule 4 forbids twice over: it blames, and it names no
     fix. The rewrite is the point of the consolidation, not a follow-up to
     it. */
  'action.cancel': 'Cancel',
  /* Two verbs, two keys. One `action.saving` served BOTH the approve and the
     reject button, each carrying its own `defaultValue` -- so the collision was
     invisible until the literals were consolidated here. */
  'applicant.action.approving': 'Approving…',
  'applicant.action.rejecting': 'Rejecting…',
  'applicant.photo.yes': 'Submitted',
  'applicant.photo.no': 'Not submitted',
  'applicant.acceptedTrips': 'Accepted trips',
  'applicant.action.approve': 'Approve captain',
  'applicant.action.decided': 'This application has already been {status}.',
  'applicant.action.reject': 'Reject application',
  'applicant.address': 'Address',
  'applicant.appLanguage': 'App language',
  'applicant.appliedAt': 'Applied on',
  'applicant.approvedDriver': 'Captain record',
  'applicant.bankDetails': 'IBAN and bank verification',
  'applicant.bankName': 'Bank',
  'applicant.bankStatus': 'Verification',
  'applicant.cancelledTrips': 'Cancelled trips',
  'applicant.city': 'Operating city',
  'applicant.confirmReject': 'Reject application',
  'applicant.decidedAt': 'Decided',
  'applicant.device': 'Device',
  'applicant.dob': 'Date of birth',
  'applicant.documentsChecklist': 'Submitted documents and verification',
  'applicant.email': 'Email',
  'applicant.error.notFoundDesc': 'Application {id} is not on file.',
  'applicant.expiresOn': 'Expires: {date}',
  'applicant.gender': 'Gender',
  'applicant.iban': 'IBAN',
  'applicant.ipLocation': 'IP location',
  'applicant.lastIp': 'Last IP',
  'applicant.movementLog': 'Movement log',
  'applicant.movementLog.empty': 'Nothing recorded for this applicant yet.',
  'applicant.nationalId': 'National ID',
  'applicant.outcome': 'Ownership and outcome',
  'applicant.personalDetails': 'Personal and contact details',
  'applicant.personalDetailsDesc': 'National identification and applicant profile.',
  'applicant.phone': 'Phone',
  'applicant.photo': 'Profile photo',
  'applicant.plate': 'Plate',
  'applicant.reject.desc': 'State the rejection reason for {name}. An automated notice will be sent.',
  'applicant.reject.reason': 'Reason',
  'applicant.reject.title': 'Reject this application?',
  'applicant.rejectionReason': 'Rejection reason',
  'applicant.screening': 'Device, network and movement',
  'applicant.screeningDesc': 'Where the application came from. A device or an address shared with another applicant is worth opening before deciding.',
  'applicant.toast.approveError': "Couldn't approve this application",
  'applicant.toast.approved': 'Captain application {id} approved',
  'applicant.toast.rejectError': "Couldn't reject this application",
  'applicant.toast.rejected': 'Application {id} rejected',
  'applicant.vehicleClass': 'Assigned tier',
  'applicant.vehicleDetails': 'Vehicle and class',
  'applicant.vehicleModel': 'Vehicle',
  'queue.col.owner': 'Owner',
  'queue.owner.unclaimed': 'Unclaimed',
  /* Screen-specific, NOT the generic `action.*` key. `action.saving`,
     `action.goBack` and `sub.selectDriver` each carried a DIFFERENT value in a
     different screen dictionary, and the last spread into `EN` wins - so
     registering this dictionary would have silently relabelled three modals.
     A key that means four things is not a key. */
  'applicant.action.backToApplications': 'Back to applications',
  /* The queue's third disposition — the one that OPENS the file rather than
     deciding it sight unseen. */
  'people.queue.review': 'Review',
  /* ── document review — the sheet and the page ────────────────────────
     The four documents are `people.col.doc.*` above and are NOT restated
     here: a document's name is one word in one place, and the review
     surfaces read it through `docLabelKey`. */
  'applicant.docStatus.verified': 'Verified',
  'applicant.docStatus.pending': 'Needs review',
  'applicant.docStatus.rejected': 'Rejected',
  'applicant.docStatus.missing': 'Not uploaded',

  /* The five reason codes. A code, never free text — see `types/applicant.ts`. */
  'applicant.docReason.unclear': 'Photo unclear or blurry',
  'applicant.docReason.expired': 'Document has expired',
  'applicant.docReason.mismatch': 'Does not match the national ID',
  'applicant.docReason.wrongType': 'Wrong document uploaded',
  'applicant.docReason.suspectedForgery': 'Suspected forgery',
  'applicant.docReason.legend': 'Rejected — {reason}',

  /* The review header. `n of m` counts VERIFIED documents, never uploaded
     ones: an upload nobody has looked at is not progress. */
  'applicant.review.progress': '{verified} of {total} verified',
  'applicant.review.openFirst': 'Open first unreviewed',
  'applicant.review.allVerified': 'Every document is verified.',
  'applicant.review.documents': 'Documents',
  'applicant.review.signals': 'Signals',
  'applicant.review.driverDetails': 'Driver details',
  'applicant.review.readFrom': 'Read from this document',
  'applicant.review.readNothing':
    'Nothing has been read off this document yet. Verifying or rejecting it records what it says.',
  'applicant.review.readNone': 'A photograph has nothing printed on it to read.',
  'applicant.review.noUpload': 'The applicant has not uploaded this document.',
  'applicant.review.fileMeta': '{kind} · {size} · uploaded {date}',
  'applicant.review.scanLoading': 'Fetching the scan…',
  'applicant.review.scanRefused': 'You do not have permission to open this scan.',
  'applicant.review.scanError': 'The scan could not be fetched.',
  'applicant.review.scanRetry': 'Try again',
  'applicant.review.openFull': 'Open full size',

  /* The three verdicts on ONE document. They are not the application's
     decision and are worded so nobody reads them as one. */
  'applicant.doc.verify': 'Verify document',
  'applicant.doc.reject': 'Reject document',
  'applicant.doc.reupload': 'Request re-upload',
  'applicant.doc.verifyRefusedNoFile': 'Nothing has been uploaded, so there is nothing to verify.',
  'applicant.doc.rejectRefusedNoFile': 'Nothing has been uploaded, so there is nothing to reject.',
  'applicant.doc.reuploadRefusedNoFile': 'Nothing has been uploaded yet.',
  'applicant.doc.rejectTitle': 'Why is this document being rejected?',
  'applicant.doc.rejectDesc':
    'The applicant is told the reason and asked for a replacement. Pick the closest one.',
  'applicant.doc.rejectConfirm': 'Reject document',
  'applicant.doc.toast.verified': '{document} verified',
  'applicant.doc.toast.rejected': '{document} rejected',
  'applicant.doc.toast.reupload': 'Re-upload requested for {document}',
  'applicant.doc.toast.error': "Couldn't record that verdict",

  /* The approval checklist. */
  'applicant.check.heading': 'Must clear before approval',
  'applicant.check.document': '{document} verified',
  'applicant.check.bank': 'Payout account verified',
  'applicant.action.documentsOpen': 'Still open: {documents}.',
  'applicant.action.bankUnverified': 'The payout account has not been verified.',

  /* The review sheet's own chrome. */
  'applicant.sheet.position': 'Application {index} of {total}',
  'applicant.sheet.previous': 'Previous application',
  'applicant.sheet.next': 'Next application',
  'applicant.sheet.openFull': 'Open full application',
  'applicant.sheet.close': 'Close',

  /* The fields read off a document. Each is what the CARD says, which is why
     the labels differ from the application's own — `Name on document` is not
     `Name`, and the difference is the whole point of the panel. */
  'applicant.read.licenceNo': 'Licence no.',
  'applicant.read.class': 'Class',
  'applicant.read.expiry': 'Expiry',
  'applicant.read.issuingCity': 'Issuing city',
  'applicant.read.nameOnDocument': 'Name on document',
  'applicant.read.idNo': 'ID number',
  'applicant.read.dateOfBirth': 'Date of birth',
  'applicant.read.nationality': 'Nationality',
  'applicant.read.plate': 'Plate',
  'applicant.read.vehicle': 'Vehicle',
  'applicant.read.keeper': 'Registered keeper',

  /* The signals block — what the application arrived from. */
  'applicant.signal.device': 'Device {device} also used by another application.',
  'applicant.signal.address': 'Address in {address} is shared with an active captain.',
  'applicant.signal.ip': 'IP location {location} — consistent with the operating city.',
  'applicant.signal.ipMismatch': 'IP location {location} does not match the operating city.',
  'applicant.signal.none': 'Nothing on this application looks unusual.',
}
