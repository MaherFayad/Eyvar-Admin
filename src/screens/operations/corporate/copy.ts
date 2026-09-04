/**
 * Operations › Corporate Accounts — every operator-facing string in the module.
 *
 * **Why this file now exists.** The four corporate files carried **59
 * `t('key', { defaultValue: 'English here' })` calls**, which put the English
 * copy inside the JSX instead of in a dictionary. That arrangement bypasses
 * `createTranslator`'s missing-key guard, cannot be handed to a translator, and
 * drifts the first time one of the strings is edited in place. `withFallback`
 * (`../localCopy`) resolves these against this dictionary until
 * `src/i18n/dictionaries.ts` — which has a single owner — imports it, at which
 * point the wrapper deletes with a one-line diff per file.
 *
 * **The copy was rewritten, not merely relocated** (`docs/ref/copy.md`):
 *
 *   - **Sentence case throughout.** `Company Name`, `Billing Email`, `Total
 *     Lifetime Spend`, `Employee Ride & Usage Policy` were Title Case.
 *   - **No `successfully`, no `Failed to`.** `Usage policy updated
 *     successfully` and `Failed to link employee` were both in the tree; rule 3
 *     forbids the first and rule 4 forbids the second. An error is an
 *     imperative that names the fix.
 *   - **British spelling.** `centralized` → `centralised`.
 *   - **The required marker is gone.** `Company Name *` used an asterisk, which
 *     §10.2 forbids anywhere in this product. A required field says nothing; an
 *     optional one carries `field.optional` as a suffix.
 *   - **Constraints moved into helper text** (rule 7). `Invoice Day (1-28)` put
 *     the constraint in the label; the label is now `Invoice day` and the range
 *     is a `FieldDescription`.
 *   - **No concatenation** (AC-75). `Method:` + value was assembled in JSX with
 *     a literal colon; it is one key with a placeholder now.
 *   - **`…` not `...`** on in-flight button labels.
 */

import type { Dictionary } from '@/lib'

export const CORPORATE_EN: Dictionary = {
  /* ── the index ─────────────────────────────────────────────────────── */
  'column.company': 'Company',
  'column.contact': 'Primary contact',
  'column.employees': 'Employees',
  'column.totalSpend': 'Spend',
  'column.billing': 'Billing',
  'column.status': 'Status',
  'column.nextInvoice': 'Next invoice',
  'corp.invoiceOverdue': 'Invoice overdue',
  'corp.meta.count': '{count} corporate accounts',
  'corp.newAccount': 'New corporate account',
  'corp.searchPlaceholder': 'Search corporate accounts',
  'corp.empty.heading': 'Company ride budgets, on one invoice',
  'corp.empty.body':
    'Register a corporate client to manage centralised ride allowances and consolidated billing.',
  'corp.empty.noMatch': 'No corporate accounts match these filters',
  /* Rule 4 — an error names the fix and never blames. `Failed to load` did
     neither. */
  'corp.error.read': "Couldn't load corporate accounts. Try again.",
  'corp.action.noPermission':
    'You cannot change this account’s policy. Ask an Owner for the “Subscription control” permission.',
  'corp.action.unlink.unavailable': 'Unlinking an employee is not connected yet. Nothing would be saved.',
  'corp.action.invoice.unavailable': 'Invoice generation is not connected yet. Nothing would be sent.',

  /* ── toasts — R9: one line, names the object, ≤ 60 characters, no period ── */
  'corp.toast.created': '{name} created',
  'corp.toast.policySaved': 'Usage policy updated',
  'corp.toast.policyError': "Couldn't update the usage policy",
  'corp.toast.employeeAdded': '{name} linked to this account',
  'corp.toast.employeeError': "Couldn't link the rider. Nothing was changed.",

  /* ── the detail page ───────────────────────────────────────────────── */
  'corp.error.notFound': 'Corporate account not found',
  'corp.error.notFoundDesc': 'Account {id} does not exist, or it has been removed.',
  'corp.card.companyDetails': 'Company and billing',
  'corp.card.companyDetailsDesc': 'Primary billing coordinates and representative.',
  'corp.contact': 'Contact person',
  'corp.email': 'Billing email',
  'corp.phone': 'Phone',
  /* O9 — a missing contact number is a fact the operator acts on. */
  'corp.phone.notSet': 'Not set',
  'corp.createdAt': 'Account opened',

  'corp.card.usagePolicy': 'Employee ride and usage policy',
  'corp.card.usagePolicyDesc': 'Spend caps, vehicle classes and manager approval rules.',
  /* The create and edit refusals name DIFFERENT actions, and shared one key
     until the `defaultValue` literals were consolidated. A refusal that names
     the wrong action is worse than a generic one. */
  'corp.action.noPermission.create':
    'You cannot open a corporate account. Ask an Owner for the “Subscription control” permission.',
  'corp.action.linking': 'Linking…',
  'action.savePolicy': 'Save policy',
  'corp.policy.monthlyCap': 'Monthly spend cap',
  'corp.policy.monthlyCapHelp': 'In riyals, across every employee on the account.',
  'corp.policy.vehicleTier': 'Allowed vehicle tier',
  'corp.policy.approvalThreshold': 'Approval required above',
  'corp.policy.approvalThresholdHelp': 'In riyals, per trip. A manager approves anything higher.',
  'corp.policy.workHoursOnly': 'Work-hours restriction',
  'corp.policy.workHoursDesc': 'Allow rides between 08:00 and 18:00 on weekdays only.',
  'corp.policy.approverEmail': 'Approver email',
  'corp.policy.approverEmailHelp': 'Where an approval request is sent.',
  'corp.tier.any': 'Any tier',
  'corp.tier.economy': 'Economy only',
  'corp.tier.comfort': 'Comfort and Economy',

  'corp.card.linkedEmployees': 'Linked employee riders',
  'corp.card.linkedEmployeesDesc': 'Employees whose rides are consolidated onto this invoice.',
  'corp.linkEmployee': 'Link employee',
  'corp.noEmployees': 'No employees linked yet',
  'corp.noEmployeesBody':
    'Link an employee rider to include their rides on the monthly consolidated invoice.',
  'corp.activeSubs': '{count} active subscriptions',
  'corp.unlinkEmployee': 'Unlink {name}',

  'corp.lifetimeSpend': 'Total lifetime spend',
  'corp.activeRidersCount': '{count} riders on account',
  'corp.invoicingSchedule': 'Invoicing schedule',
  /* AC-75 — the colon is inside the key so a translator can make it an Arabic
     one, and so bidi never has to reconcile a JSX-assembled `label + ':'`. */
  'corp.method': 'Method',
  'corp.billingDay': 'Billing cycle',
  'corp.billingDay.value': 'Day {day} of each month',
  'corp.nextInvoice': 'Next invoice',
  'corp.nextInvoice.upcoming': 'Not scheduled',
  'corp.sendInvoice': 'Generate invoice',

  /* ── new-account dialog ────────────────────────────────────────────── */
  'corp.new.saveError': "Couldn't create the account. Nothing was saved.",
  'corp.new.title': 'New corporate account',
  'corp.new.desc': 'Register a company account for consolidated employee ride billing.',
  'corp.companyName': 'Company name',
  'corp.contactName': 'Contact person',
  'corp.contactEmail': 'Billing email',
  'corp.contactPhone': 'Phone',
  'corp.billingType': 'Billing method',
  'corp.billing.monthly': 'Monthly invoice',
  'corp.billing.prepaid': 'Prepaid balance',
  'corp.expectedEmployees': 'Expected headcount',
  'corp.invoiceDay': 'Invoice day',
  'corp.invoiceDayHelp': 'A day of the month between 1 and 28.',
  'action.cancel': 'Cancel',
  'corp.createAccount': 'Create account',
  'corp.creating': 'Creating…',

  /* ── link-employee dialog ──────────────────────────────────────────── */
  'corp.addEmployee.saveError': "Couldn't link the rider. Nothing was changed.",
  'corp.addEmployee.title': 'Link an employee rider',
  'corp.addEmployee.desc': 'Rides taken by this rider are billed to {company}.',
  'corp.selectRider': 'Rider',
  'corp.selectRiderHelp': 'Only riders who are not already on a corporate account are listed.',
  'corp.noRidersAvailable': 'Every rider is already linked',
  'corp.noRidersAvailableBody': 'There is no registered rider left to add to {company}.',
  'corp.selectRiderPlaceholder': 'Choose a rider',
  'corp.linkRider': 'Link employee',
  'corp.linking': 'Linking…',
  /* Screen-specific, NOT the generic `action.*` key. `action.saving`,
     `action.goBack` and `sub.selectDriver` each carried a DIFFERENT value in a
     different screen dictionary, and the last spread into `EN` wins - so
     registering this dictionary would have silently relabelled three modals.
     A key that means four things is not a key. */
  'corp.action.savingPolicy': 'Saving…',
  'corp.action.backToAccounts': 'Back to corporate accounts',
}
