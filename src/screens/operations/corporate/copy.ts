/**
 * Operations › Corporate Accounts - every operator-facing string, per AC-74.
 * Sentence case, no asterisk on a required label (§10.2), no concatenation
 * (AC-75). An explanatory sentence lives under `corp.hint.*` and opens from an
 * `InfoHint` (X15); one that changes what the operator does next stays inline.
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
  'corp.empty.heading': 'Company rides, one invoice',
  'corp.empty.body':
    'Register a corporate client to manage centralised ride allowances and consolidated billing.',
  'corp.empty.noMatch': 'No corporate accounts match these filters',
  /* Rule 4 — an error names the fix and never blames. */
  'corp.error.read': "Couldn't load corporate accounts. Try again.",
  'corp.action.noPermission':
    'You cannot change this account’s policy. Ask an Owner for the “Subscription control” permission.',

  /* ── the four states an account can be in (X2: keyed, never the value) ── */
  'corp.status.Active': 'Active',
  'corp.status.Trial': 'Trial',
  'corp.status.Pending': 'Pending',
  'corp.status.Suspended': 'Suspended',

  /* ── toasts — R9: one line, names the object, no period ─────────────── */
  'corp.toast.created': '{name} created',
  'corp.toast.policySaved': 'Usage policy updated',
  'corp.toast.policyError': "Couldn't update the usage policy",
  'corp.toast.employeeAdded': '{name} linked to this account',
  'corp.toast.employeeError': "Couldn't link the rider. Nothing was changed.",
  'corp.toast.employeeRemoved': '{name} unlinked from this account',
  'corp.toast.employeeRemoveError': "Couldn't unlink the rider. Nothing changed.",
  'corp.toast.invoiceSent': 'Invoice generated for {name}',
  'corp.toast.invoiceError': "Couldn't generate the invoice. Nothing was sent.",

  /* ── the detail page ───────────────────────────────────────────────── */
  'corp.error.notFound': 'Corporate account not found',
  'corp.error.notFoundDesc': 'Account {id} does not exist, or it has been removed.',
  /* AC-75 — the whole meta line is one key, so bidi never has to reconcile a
     separator assembled in JSX. */
  'corp.detail.meta': '{id} · {billing} · {status}',
  'corp.card.companyDetails': 'Company and billing',
  'corp.hint.companyDetails': 'Primary billing coordinates and representative.',
  'corp.contact': 'Contact person',
  'corp.email': 'Billing email',
  'corp.phone': 'Phone',
  /* O9 — a missing contact number is a fact the operator acts on. */
  'corp.phone.notSet': 'Not set',
  'corp.createdAt': 'Account opened',

  'corp.card.usagePolicy': 'Employee ride and usage policy',
  /* X15 - the three field help sentences fold in here: `SAR` on the two money
     inputs now carries "in riyals", and what is left is scope, not a
     constraint, so §5.7 r7 keeps nothing below a control. */
  'corp.hint.usagePolicy':
    'The cap is monthly across every employee. The approval threshold is per trip. Work hours allow rides 08:00 to 18:00 on weekdays.',
  'corp.action.noPermission.create':
    'You cannot open a corporate account. Ask an Owner for the “Subscription control” permission.',
  'corp.action.linking': 'Linking…',
  'action.savePolicy': 'Save policy',
  'corp.policy.monthlyCap': 'Monthly spend cap',
  'corp.policy.monthlyCap.placeholder': 'No limit',
  'corp.policy.vehicleTier': 'Allowed vehicle tier',
  'corp.policy.approvalThreshold': 'Approval required above',
  'corp.policy.approvalThreshold.placeholder': 'Not required',
  'corp.policy.workHoursOnly': 'Work-hours restriction',
  'corp.policy.approverEmail': 'Approver email',
  'corp.policy.approverEmail.placeholder': 'manager@company.sa',
  /* §10.2 — the in-field inline-START prefix on a money input. */
  'corp.sar': 'SAR',
  'corp.tier.any': 'Any tier',
  'corp.tier.economy': 'Economy only',
  'corp.tier.comfort': 'Comfort and Economy',

  'corp.card.linkedEmployees': 'Linked employee riders',
  'corp.hint.linkedEmployees': 'Employees whose rides are consolidated onto this invoice.',
  'corp.linkEmployee': 'Link employee',
  'corp.noEmployees': 'No employees linked yet',
  'corp.noEmployeesBody':
    'Link an employee rider to include their rides on the monthly consolidated invoice.',
  'corp.activeSubs': '{count} active subscriptions',
  /* AC-75 - the employee meta line is one key; the separator is never
     assembled in JSX, so bidi has one run to reconcile. */
  'corp.employee.meta': '{id} · {phone} · {city}',
  'corp.unlinkEmployee': 'Unlink {name}',
  'corp.unlink.confirm.title': 'Unlink {name}?',
  'corp.unlink.confirm.body': 'Past rides stay billed here. New rides are not.',
  'corp.unlink.confirm.action': 'Unlink employee',
  /* §11.2 — refused in place before the click, because the account already
     carries the fact each refusal turns on. */
  'corp.unlink.blocked.unbilled': 'This account has an unsent invoice. Send it before unlinking.',

  'corp.lifetimeSpend': 'Total lifetime spend',
  'corp.hint.lifetimeSpend': 'Every ride billed to this account, across {count} linked riders.',
  'corp.invoicingSchedule': 'Invoicing schedule',
  'corp.method': 'Method',
  'corp.billingDay': 'Billing cycle',
  'corp.billingDay.value': 'Day {day} of month',
  'corp.nextInvoice': 'Next invoice',
  'corp.nextInvoice.upcoming': 'Not scheduled',
  'corp.sendInvoice': 'Generate invoice',
  'corp.action.invoicing': 'Generating…',
  'corp.invoice.blocked.notActive': 'Only an active account can be invoiced.',
  'corp.invoice.blocked.prepaid': 'A prepaid account is never invoiced.',
  'corp.invoice.blocked.noSpend': 'There is no spend to invoice yet.',

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
  /* Screen-specific, NOT the generic `action.*` key: `action.saving` and
     `action.goBack` each carry a different value in another dictionary, and the
     last spread into `EN` wins. */
  'corp.action.savingPolicy': 'Saving…',
  'corp.action.backToAccounts': 'Back to accounts',
}
