/**
 * Admin › Workspace — the merged `general` + `branding` + `legal` pane.
 *
 * The `admin.audit.workspace.*` keys at the bottom are `LocalisedText` minted by
 * `clients/workspace.ts`; `i18n/localisedKeys.test.ts` fails the build if one is
 * missing here.
 */

import type { Dictionary } from '@/lib'

export const ADMIN_WORKSPACE_EN: Dictionary = {
  'admin.workspace.meta': 'Company details, branding, and the legal versions in force',
  'admin.workspace.entity': 'Workspace settings',

  /* ── general ────────────────────────────────────────────────────────── */
  'admin.workspace.general.title': 'General',
  'admin.workspace.general.desc': 'How the console names itself, and where riders write when something is wrong.',
  'admin.workspace.siteName': 'Portal name',
  'admin.workspace.siteDescription': 'Description',
  'admin.workspace.siteDescriptionHelp': 'Used as the page description. One sentence.',
  'admin.workspace.supportEmail': 'Support email',
  'admin.workspace.supportPhone': 'Support hotline',
  'admin.workspace.timezone': 'Timezone',
  'admin.workspace.currency': 'Operating currency',
  'admin.workspace.tz.Asia/Riyadh': 'Riyadh (UTC+03:00)',
  'admin.workspace.tz.Asia/Dubai': 'Dubai (UTC+04:00)',
  'admin.workspace.tz.Europe/London': 'London (UTC+00:00)',
  'admin.workspace.currency.SAR': 'Saudi riyal (SAR)',
  'admin.workspace.currency.AED': 'UAE dirham (AED)',

  /* ── branding ───────────────────────────────────────────────────────── */
  'admin.workspace.branding.title': 'Branding',
  'admin.workspace.branding.desc': 'One wordmark per language, and one logo. There is no second logo.',
  'admin.workspace.brandEn': 'Wordmark (English)',
  'admin.workspace.brandAr': 'Wordmark (Arabic)',
  'admin.workspace.logo': 'Logo',
  'admin.workspace.logo.none': 'No logo uploaded',
  'admin.workspace.logo.help': 'PNG, JPG or SVG, under 200 KB. A transparent file at roughly 2:1 works best.',
  'admin.workspace.logo.upload': 'Upload logo',
  'admin.workspace.logo.replace': 'Replace logo',
  'admin.workspace.logo.remove': 'Remove logo',
  'admin.workspace.logo.uploading': 'Uploading…',
  'admin.workspace.logo.tooLarge': 'That file is {size} and the limit is 200 KB. Pick a smaller one.',
  'admin.workspace.logo.wrongType': 'Pick a PNG, JPG or SVG.',
  'admin.workspace.logo.uploaded': 'Logo updated',
  'admin.workspace.logo.removed': 'Logo removed',
  'admin.workspace.logo.preview': 'Current logo',
  'admin.workspace.logo.meta': '{file} · {size}',
  'admin.workspace.logo.oneStore':
    'This replaces both legacy logo stores. The rail, the favicon and this preview now read the same file.',

  /* ── legal ──────────────────────────────────────────────────────────── */
  'admin.workspace.legal.title': 'Legal & consent',
  'admin.workspace.legal.desc': 'The version in force for each document, and who is still on an older one.',
  'admin.workspace.legal.tos': 'Terms of service',
  'admin.workspace.legal.privacy': 'Privacy notice',
  'admin.workspace.legal.driverAgreement': 'Captain agreement',
  'admin.workspace.legal.version': 'Version {version}, published {date}',
  'admin.workspace.legal.pending': '{count} accounts are on an older version',
  'admin.workspace.legal.current': 'Everyone is on this version',
  'admin.workspace.legal.queue': 'Queue re-consent',
  'admin.workspace.legal.queueing': 'Queueing…',
  'admin.workspace.legal.queued': 'Re-consent queued for {count} accounts',
  'admin.workspace.legal.nothingToQueue': 'Nobody is on an older version, so nothing was queued.',
  'admin.workspace.legal.refusal.allCurrent': 'Everyone is already on this version.',
  'admin.workspace.legal.refusal.noPermission': 'Your role cannot change workspace settings.',
  'admin.workspace.legal.publishNote':
    'Publishing a new version is not built here. Legacy kept a version history per document; this pane shows the version in force and who has not accepted it.',

  /* ── the four states, and the save bar ──────────────────────────────── */
  'admin.workspace.empty.heading': 'Workspace not configured',
  'admin.workspace.empty.body':
    'Nothing has been set for this workspace yet — no name, no support address, no legal versions. Set them and every screen picks them up.',
  'admin.workspace.empty.action': 'Reload',
  'admin.workspace.error': 'Workspace settings could not be loaded.',
  'admin.workspace.saved': 'Workspace settings saved',
  'admin.workspace.discarded': 'Changes discarded',
  'admin.workspace.readOnly': 'Your role cannot change workspace settings.',

  /* ── LocalisedText minted by clients/workspace.ts ───────────────────── */
  'admin.audit.workspace.updated': 'Workspace settings saved — changed: {fields}',
  'admin.audit.workspace.logoUpdated': 'Workspace logo replaced with {file}',
  'admin.audit.workspace.logoRemoved': 'Workspace logo removed',
  'admin.audit.workspace.reconsentQueued': 'Queued re-consent for v{version} to {count} accounts',

  /* ══════════════════ integrations — API keys and webhooks (P6-T10) ══════

     D20 puts API keys and webhooks on THIS sub-tab as a fourth pane, and the
     `admin.audit.integrations.*` keys at the bottom are `LocalisedText` minted
     by `clients/integrations.ts` — `i18n/localisedKeys.test.ts` fails the
     build if one is missing.

     Two rules the strings obey, both borrowed from the Communications
     dictionary because they were right there:

     **No sentence is assembled from two translated fragments.** Where a
     sentence varies by an enum — a failure code, a replay refusal, a scope —
     there is ONE key per member, never `'{prefix}: {reason}'`. Arabic does not
     order those two halves the way English does.

     **A refusal names the fix.** Every `.refusal.*` and every `.blocked` line
     ends on a next move, because §11.2 asks for a stated reason and a reason
     an operator cannot act on is decoration.

     And one rule this pane adds: **nothing in here implies a secret can be
     fetched again.** AC-951's re-read clause is ruled in the data model
     (`data/types/integrations.ts`), and the copy has to hold the same line —
     which is why the reveal warning states what Eyvar keeps, and why every
     "lost it" sentence ends in `rotate`, never in "ask support". */
  'admin.integrations.title': 'Integrations',
  'admin.integrations.desc':
    'Keys that let other systems call Eyvar, and endpoints Eyvar calls when something happens.',
  'admin.integrations.readOnly': 'Your role cannot change integrations.',
  'admin.integrations.cancel': 'Cancel',

  /* ── API keys ───────────────────────────────────────────────────────── */
  'admin.integrations.key.title': 'API keys',
  'admin.integrations.key.desc':
    'What can call Eyvar, and with how much authority. A key is shown once when it is issued and identified by its prefix afterwards.',
  'admin.integrations.key.issue': 'Issue API key',
  'admin.integrations.key.issuing': 'Issuing…',
  'admin.integrations.key.issue.title': 'Issue an API key',
  'admin.integrations.key.issue.desc':
    'The key is displayed once, on the next screen. Eyvar keeps only its prefix, so it cannot be shown again.',
  'admin.integrations.key.issue.blocked': 'Name the key and pick at least one scope.',
  'admin.integrations.key.issue.failed': 'The key could not be issued.',
  'admin.integrations.key.name.label': 'Name',
  'admin.integrations.key.name.help': 'What this key is for — the system that will present it.',
  'admin.integrations.key.name.required': 'Name the integration this key is for.',
  'admin.integrations.key.scopes.label': 'Scopes',
  'admin.integrations.key.scopes.help':
    'A key can do exactly what its scopes allow and nothing else. Grant the narrowest set that does the job.',
  'admin.integrations.key.scopes.ceiling':
    'A key cannot carry a permission you do not hold yourself. The rest are shown so you know what exists.',
  'admin.integrations.key.scopes.required':
    'A key with no scopes can do nothing. Pick at least one.',
  'admin.integrations.key.scopes.writeMarker': '· changes data',
  'admin.integrations.key.col.name': 'Key',
  'admin.integrations.key.col.scopes': 'Scopes',
  'admin.integrations.key.col.state': 'Status',
  'admin.integrations.key.col.lastUsed': 'Last used',
  'admin.integrations.key.col.created': 'Issued',
  'admin.integrations.key.filter.state': 'Status',
  'admin.integrations.key.state.active': 'Active',
  'admin.integrations.key.state.revoked': 'Revoked',
  'admin.integrations.key.rotatedOn': 'Rotated {date}',
  'admin.integrations.key.neverUsed': 'Never used',
  'admin.integrations.key.requests': '{count} calls',
  'admin.integrations.key.search': 'Search keys by name or prefix',
  'admin.integrations.key.rotate': 'Rotate',
  'admin.integrations.key.rotate.confirm.title': 'Rotate this key?',
  'admin.integrations.key.rotate.confirm.body':
    'A new key is issued for {name} and shown once. The current key stops working immediately, so anything still using it will start failing. The name, the scopes and the usage history do not change.',
  'admin.integrations.key.rotate.failed': 'The key could not be rotated.',
  'admin.integrations.key.revoke': 'Revoke',
  'admin.integrations.key.revoke.confirm.title': 'Revoke this key?',
  'admin.integrations.key.revoke.confirm.body':
    '{name} stops working immediately and cannot be brought back. The row and its usage history stay in the list. If the integration is still needed, issue a new key instead.',
  'admin.integrations.key.revoke.done': '{name} revoked',
  'admin.integrations.key.revoke.failed': 'The key could not be revoked.',
  'admin.integrations.key.refusal.revoked':
    'This key is revoked. Issue a new one for this integration.',
  'admin.integrations.key.empty.heading': 'Let another system call Eyvar',
  'admin.integrations.key.empty.body':
    'An API key lets a billing job, a partner portal or a warehouse export read and write through the same permissions your operators have. Each key carries only the scopes you grant it.',
  'admin.integrations.key.noMatch': 'No keys match this search.',
  'admin.integrations.key.error': 'API keys could not be loaded.',

  /* ── scope names. D17's twenty keys; `manage_settings` is retired and is
        not offerable, so it has no line here. ───────────────────────────── */
  'admin.integrations.scope.view_analytics': 'View analytics',
  'admin.integrations.scope.view_operations': 'View operations',
  'admin.integrations.scope.view_finance': 'View finance',
  'admin.integrations.scope.view_support': 'View support',
  'admin.integrations.scope.view_admin': 'View admin',
  'admin.integrations.scope.view_profiles': 'View profiles',
  'admin.integrations.scope.approve_drivers': 'Approve captains',
  'admin.integrations.scope.manage_subscriptions': 'Manage subscriptions',
  'admin.integrations.scope.live_ops': 'Live dispatch',
  'admin.integrations.scope.manage_plans': 'Manage plans',
  'admin.integrations.scope.process_payouts': 'Process payouts',
  'admin.integrations.scope.release_escrow': 'Release escrow',
  'admin.integrations.scope.apply_deductions': 'Apply deductions',
  'admin.integrations.scope.manage_tickets': 'Manage tickets',
  'admin.integrations.scope.contact_users': 'Contact users',
  'admin.integrations.scope.manage_team': 'Manage team',
  'admin.integrations.scope.manage_ops_policy': 'Manage operational policy',
  'admin.integrations.scope.manage_workspace': 'Manage workspace',
  'admin.integrations.scope.manage_data_governance': 'Manage data governance',
  'admin.integrations.scope.manage_security_policy': 'Manage security policy',
  'admin.integrations.scope.unknown': 'Unrecognised scope',

  /* ── the one-time reveal. AC-951 lives in these strings. ─────────────── */
  'admin.integrations.reveal.key.issued.title': 'Copy this key now',
  'admin.integrations.reveal.key.rotated.title': 'Copy the new key now',
  'admin.integrations.reveal.webhook.issued.title': 'Copy this signing secret now',
  'admin.integrations.reveal.webhook.rotated.title': 'Copy the new signing secret now',
  'admin.integrations.reveal.subject': 'For {name}',
  'admin.integrations.reveal.warning.key.title': 'This is the only time this key is shown',
  'admin.integrations.reveal.warning.key.body':
    'Eyvar stores only the prefix {prefix}. The rest is not stored anywhere and cannot be shown again — not by reopening this row, not by an export, and not by support. If it is lost, rotate the key to issue a new one.',
  'admin.integrations.reveal.warning.webhook.title':
    'This is the only time this signing secret is shown',
  'admin.integrations.reveal.warning.webhook.body':
    'Eyvar stores only the prefix {prefix}. Your receiving system needs the whole secret to verify our signatures. It cannot be shown again — if it is lost, rotate it and update the receiver.',
  'admin.integrations.reveal.label': 'Secret',
  'admin.integrations.reveal.copy': 'Copy',
  'admin.integrations.reveal.copied': 'Copied',
  'admin.integrations.reveal.help':
    'Paste it straight into the system that will use it. Do not email it and do not put it in a ticket.',
  'admin.integrations.reveal.ack.key':
    'I have copied this key and understand it cannot be shown again.',
  'admin.integrations.reveal.ack.webhook':
    'I have copied this signing secret and understand it cannot be shown again.',
  'admin.integrations.reveal.done': 'I have copied it',
  'admin.integrations.reveal.blocked':
    'Tick the box above to close. Closing this is the only chance to copy the secret.',

  /* ── webhook endpoints ──────────────────────────────────────────────── */
  'admin.integrations.webhook.title': 'Webhook endpoints',
  'admin.integrations.webhook.desc':
    'Where Eyvar posts when something happens, and which events each endpoint hears about.',
  'admin.integrations.webhook.create': 'Register endpoint',
  'admin.integrations.webhook.create.title': 'Register a webhook endpoint',
  'admin.integrations.webhook.create.desc':
    'A signing secret is generated and displayed once, on the next screen. The receiver needs it to verify that a payload came from Eyvar.',
  'admin.integrations.webhook.edit': 'Edit',
  'admin.integrations.webhook.edit.title': 'Edit endpoint',
  'admin.integrations.webhook.edit.desc':
    'Change the target or what it hears about. The signing secret is not affected — rotate it separately if it needs replacing.',
  'admin.integrations.webhook.save': 'Save endpoint',
  'admin.integrations.webhook.saving': 'Saving…',
  'admin.integrations.webhook.saved': '{name} saved',
  'admin.integrations.webhook.blocked':
    'Name the endpoint, give an https:// URL, and pick an event.',
  'admin.integrations.webhook.failed': 'The endpoint could not be saved.',
  'admin.integrations.webhook.name.label': 'Name',
  'admin.integrations.webhook.name.help': 'Who receives this — the system, not the URL.',
  'admin.integrations.webhook.name.required': 'Name the endpoint.',
  'admin.integrations.webhook.url.label': 'URL',
  'admin.integrations.webhook.url.help':
    'An absolute https:// URL. Signed payloads are not sent over http.',
  'admin.integrations.webhook.url.invalid':
    'That is not an absolute https:// URL. Signed payloads are not sent over http.',
  'admin.integrations.webhook.events.label': 'Events',
  'admin.integrations.webhook.events.required':
    'An endpoint with no events subscribed never fires. Pick at least one.',
  'admin.integrations.webhook.state.enabled': 'Enabled',
  'admin.integrations.webhook.state.disabled': 'Disabled',
  'admin.integrations.webhook.failing': '{count} failures in a row',
  'admin.integrations.webhook.secret.never': 'Signing secret never rotated',
  'admin.integrations.webhook.secret.rotated': 'Signing secret rotated {date}',
  'admin.integrations.webhook.noDeliveries': 'Nothing delivered yet',
  'admin.integrations.webhook.lastDelivery': 'Last delivery {date}',
  'admin.integrations.webhook.rotate': 'Rotate secret',
  'admin.integrations.webhook.rotate.confirm.title': 'Rotate the signing secret?',
  'admin.integrations.webhook.rotate.confirm.body':
    'A new secret for {name} is shown once. Until the receiver is updated, every payload it verifies will fail its signature check. Deliveries already in the log are unaffected.',
  'admin.integrations.webhook.rotate.failed': 'The signing secret could not be rotated.',
  'admin.integrations.webhook.enable': 'Enable',
  'admin.integrations.webhook.disable': 'Disable',
  'admin.integrations.webhook.disable.confirm.title': 'Disable this endpoint?',
  'admin.integrations.webhook.disable.confirm.body':
    'Eyvar stops posting to {name}. The endpoint keeps its events, its signing secret and its delivery history, and enabling it again is one click.',
  'admin.integrations.webhook.enabled': '{name} enabled',
  'admin.integrations.webhook.disabled': '{name} disabled',
  'admin.integrations.webhook.empty.heading': 'Tell another system when something happens',
  'admin.integrations.webhook.empty.body':
    'A webhook endpoint receives a signed payload the moment a trip completes, a subscription lapses or a payout settles — so a partner system does not have to poll for it.',
  'admin.integrations.webhook.error': 'Webhook endpoints could not be loaded.',

  /* ── event names. One key per member of the union. ───────────────────── */
  'admin.integrations.event.tripCompleted': 'Trip completed',
  'admin.integrations.event.tripCancelled': 'Trip cancelled',
  'admin.integrations.event.subscriptionActivated': 'Subscription activated',
  'admin.integrations.event.subscriptionExpired': 'Subscription expired',
  'admin.integrations.event.payoutPaid': 'Payout paid',
  'admin.integrations.event.paymentFailed': 'Payment failed',
  'admin.integrations.event.driverApproved': 'Captain approved',
  'admin.integrations.event.riderRegistered': 'Rider registered',

  /* ── the delivery log and its replay control (AC-952) ────────────────── */
  'admin.integrations.delivery.title': 'Delivery log',
  'admin.integrations.delivery.desc':
    'Every attempt Eyvar made, what the endpoint answered, and a replay for the ones that failed. A replay is a new attempt — the failed one stays in the log.',
  'admin.integrations.delivery.search': 'Search deliveries by id or subject',
  'admin.integrations.delivery.col.event': 'Event',
  'admin.integrations.delivery.col.endpoint': 'Endpoint',
  'admin.integrations.delivery.col.state': 'Result',
  'admin.integrations.delivery.col.attempted': 'Attempted',
  'admin.integrations.delivery.col.duration': 'Took',
  'admin.integrations.delivery.col.id': 'Delivery',
  'admin.integrations.delivery.filter.event': 'Event',
  'admin.integrations.delivery.filter.endpoint': 'Endpoint',
  'admin.integrations.delivery.filter.state': 'Result',
  'admin.integrations.delivery.state.pending': 'Queued',
  'admin.integrations.delivery.state.succeeded': 'Delivered',
  'admin.integrations.delivery.state.failed': 'Failed',
  'admin.integrations.delivery.failure.timeout':
    'The endpoint did not answer in time. A replay is worth trying.',
  'admin.integrations.delivery.failure.connectionRefused':
    'The endpoint refused the connection. Check it is running, then replay.',
  'admin.integrations.delivery.failure.dnsFailure':
    'The hostname did not resolve. Check the URL, then replay.',
  'admin.integrations.delivery.failure.tlsError':
    'The TLS handshake failed. Check the certificate, then replay.',
  'admin.integrations.delivery.failure.http4xx':
    'The endpoint rejected the payload. A replay sends the same payload and will fail the same way until the endpoint changes.',
  'admin.integrations.delivery.failure.http5xx':
    'The endpoint errored. This is usually temporary — replay it.',
  'admin.integrations.delivery.noResponse': 'No response received',
  'admin.integrations.delivery.noDuration': 'Not yet',
  'admin.integrations.delivery.ms': '{ms} ms',
  'admin.integrations.delivery.replayOf': 'Replay of {id}',
  'admin.integrations.delivery.replay': 'Replay',
  'admin.integrations.delivery.replay.confirm.title': 'Replay this delivery?',
  'admin.integrations.delivery.replay.confirm.body':
    'The same payload is queued for {endpoint} as a new attempt. {id} stays in the log exactly as it is, including its status code and response — a replay does not undo a failure, it adds an attempt.',
  'admin.integrations.delivery.replay.failed': 'The delivery could not be replayed.',
  'admin.integrations.delivery.replayed': 'Queued {id} as a replay of {original}',
  'admin.integrations.delivery.refusal.pending':
    'This attempt has not finished yet. Wait for its result before replaying.',
  'admin.integrations.delivery.refusal.succeeded':
    'This one was delivered. Only a failed attempt is replayed.',
  'admin.integrations.delivery.refusal.endpointDisabled':
    'The endpoint is disabled. Enable it above, then replay.',
  'admin.integrations.delivery.refusal.unknown': 'This attempt cannot be replayed.',
  'admin.integrations.delivery.empty.heading': 'Nothing has been delivered yet',
  'admin.integrations.delivery.empty.body':
    'Once an endpoint is registered and one of its events happens, every attempt and every response appears here.',
  'admin.integrations.delivery.noMatch': 'No deliveries match these filters.',
  'admin.integrations.delivery.error': 'The delivery log could not be loaded.',

  /* ── LocalisedText minted by clients/integrations.ts ─────────────────── */
  'admin.audit.integrations.keyIssued': 'API key issued — {name} ({prefix}), scopes: {scopes}',
  'admin.audit.integrations.keyRotated': 'API key rotated — {name}, {from} replaced by {to}',
  'admin.audit.integrations.keyRevoked': 'API key revoked — {name} ({prefix})',
  'admin.audit.integrations.webhookCreated':
    'Webhook registered — {name} at {url}, events: {events}',
  'admin.audit.integrations.webhookUpdated':
    'Webhook updated — {name}, changed: {fields}, now {state}',
  'admin.audit.integrations.webhookSecretRotated':
    'Webhook signing secret rotated — {name}, {from} replaced by {to}',
  'admin.audit.integrations.webhookReplayed':
    'Webhook delivery replayed — {endpoint}, {original} queued as {replay}',
}
