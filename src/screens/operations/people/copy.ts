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
  'people.col.complaints': 'Open complaints',
  'people.col.sla': 'SLA',
  'people.col.owner': 'Owner',
  'people.col.decision': 'Decision',
  'people.col.plate': 'Plate',
  'people.col.docs': 'Documents',
  'people.col.dispatch': 'Dispatch',
  'people.col.doc.license': 'Licence',
  'people.col.doc.vehicleReg': 'Registration',
  'people.col.doc.inspection': 'Inspection',
  'people.col.doc.insurance': 'Insurance',
  'people.col.doc.operatingCard': 'Operating card',

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
  'people.action.openApplication': 'Open application',
  'people.action.suspend': 'Suspend captain',
  'people.action.reinstate': 'Reinstate captain',
  'people.action.viewCompliance': 'Open compliance file',
  'people.action.noPermission': 'Needs the approve_drivers permission',
  'people.bulk.suspend': 'Suspend',
  'people.bulk.reinstate': 'Reinstate',

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
}
