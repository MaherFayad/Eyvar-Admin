/**
 * Admin › Workspace › Integrations — **P6-T10**, and the two acceptance
 * criteria D20 wrote for it.
 *
 * The assertions that matter, and why each is not satisfied by a screen that
 * merely renders:
 *
 *   1. **AC-951 is a data-model claim, so it is asserted against the model.**
 *      *"Reopening the key's row afterwards shows only its prefix"* is only
 *      true if there is nothing else to show. The first test asserts the
 *      **shape** — no element of `listApiKeys` carries a secret, on any
 *      response, before or after an issue — because a test that only checked
 *      the rendered row would still pass on a build that shipped the secret to
 *      the browser and chose not to draw it.
 *   2. **The reveal cannot be dismissed by accident.** `Escape` and the
 *      acknowledgement gate are what make *"exactly once"* survive a
 *      reflexive click, so both are asserted rather than assumed.
 *   3. **AC-952 is asserted as a pair of rows.** A replay that mutated the
 *      failed attempt would satisfy a naive *"can be replayed from there"* and
 *      would destroy the evidence the operator opened the log to read.
 *   4. **The escalation ceiling is asserted at the client**, not at the form.
 *      A form that offers only the operator's own scopes is a convenience; the
 *      422 is the boundary.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { API_KEY_SCOPES } from '@/data/types/integrations'
import { PERMISSION_KEYS } from '@/shell/permissions'

import {
  disableMockLatency,
  getRouteTable,
  issueApiKey,
  listApiKeys,
  listAuditEntries,
  listWebhookDeliveries,
  listWebhookEndpoints,
  mockFailures,
  replayWebhookDelivery,
  resetDataLayer,
  resetIntegrations,
  resetWorkspace,
  revokeApiKey,
  rotateApiKey,
  switchMockUser,
  updateWebhookEndpoint,
} from '@/data/clients'
import type { SubTabRoute } from '@/data/types'
import { isApiError } from '@/data/types'
import { ShellProvider } from '@/shell/ShellContext'
import { AdminWorkspaceScreen } from './AdminWorkspaceScreen'

const row = (): SubTabRoute => {
  const found = getRouteTable().subTabs.find((each) => each.subTabId === 'admin-workspace')
  if (!found) throw new Error('No route-table row for admin-workspace')
  return found
}

beforeEach(async () => {
  disableMockLatency()
  resetDataLayer()
  resetWorkspace()
  /* `resetIntegrations` is not yet wired into `resetDataLayer` — that function
     sits mid-file in a barrel several agents are appending to today, so it was
     left alone deliberately and is called here instead. Raised in the handoff. */
  resetIntegrations()
  mockFailures.clear()
  await switchMockUser('USR-1')
})

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={['/admin/workspace']}>
      <ShellProvider>
        <AdminWorkspaceScreen row={row()} />
      </ShellProvider>
    </MemoryRouter>,
  )
}

/* ══════════════════════ AC-951 — the secret, exactly once ═══════════════ */

describe('AC-951 — a key secret is shown once and has no re-read path', () => {
  it('serves no secret on any API key read, before or after an issue', async () => {
    const before = await listApiKeys({ pageSize: 100 })
    for (const key of before.items) {
      expect(Object.keys(key)).not.toContain('secret')
      expect(Object.keys(key)).not.toContain('secretDigest')
    }

    const result = await issueApiKey({ name: 'Test key', scopes: ['view_analytics'] })
    expect(result.issued.secret.length).toBeGreaterThan(20)
    expect(result.issued.oneTime).toBe(true)

    const after = await listApiKeys({ pageSize: 100 })
    const stored = after.items.find((key) => key.id === result.key.id)
    expect(stored, 'the issued key is in the list').toBeDefined()
    /* The whole ruling, in one assertion: the list element carries the prefix
       and nothing that could be reassembled into the credential. */
    expect(JSON.stringify(stored)).not.toContain(result.issued.secret)
    expect(stored?.prefix).toBe(result.issued.prefix)
  })

  it('mints a different secret every time, so no two keys share a credential', async () => {
    const first = await issueApiKey({ name: 'One', scopes: ['view_analytics'] })
    const second = await issueApiKey({ name: 'Two', scopes: ['view_analytics'] })
    expect(first.issued.secret).not.toBe(second.issued.secret)
    expect(first.issued.prefix).not.toBe(second.issued.prefix)
  })

  it('keeps the key identity across a rotation and replaces only the credential', async () => {
    const issued = await issueApiKey({
      name: 'Reconciliation',
      scopes: ['view_finance', 'view_analytics'],
    })
    const rotated = await rotateApiKey(issued.key.id)

    expect(rotated.key.id).toBe(issued.key.id)
    expect(rotated.key.name).toBe(issued.key.name)
    expect(rotated.key.scopes).toEqual(issued.key.scopes)
    expect(rotated.key.rotatedAt).not.toBeNull()
    /* A rotation is the answer to "I lost it", so it must produce a NEW
       credential rather than re-showing the old one. */
    expect(rotated.issued.secret).not.toBe(issued.issued.secret)
    expect(rotated.key.prefix).toBe(rotated.issued.prefix)
  })

  it('refuses to rotate a revoked key rather than resurrecting a dead credential', async () => {
    const issued = await issueApiKey({ name: 'Doomed', scopes: ['view_analytics'] })
    await revokeApiKey(issued.key.id)
    await expect(rotateApiKey(issued.key.id)).rejects.toMatchObject({ status: 409 })
  })

  it('refuses a scope the issuer does not hold — the escalation ceiling', async () => {
    /* USR-5 is the Ops Manager: thirteen keys, and `process_payouts` is not
       one of them. Without this guard a settings pane mints a credential that
       moves money. */
    await switchMockUser('USR-5')
    await expect(
      issueApiKey({ name: 'Sneaky', scopes: ['view_operations', 'process_payouts'] }),
    ).rejects.toSatisfy(
      (thrown: unknown) =>
        isApiError(thrown) &&
        thrown.status === 422 &&
        thrown.details.some((detail) => detail.code === 'scope_exceeds_issuer'),
    )
  })

  it('writes one audit entry per key act, and none of them carries the secret', async () => {
    const issued = await issueApiKey({ name: 'Audited', scopes: ['view_analytics'] })
    await rotateApiKey(issued.key.id)
    await revokeApiKey(issued.key.id)

    const log = await listAuditEntries({ subjectType: 'apiKey', pageSize: 100 })
    const mine = log.items.filter((entry) => entry.subjectId === issued.key.id)
    expect(mine).toHaveLength(3)
    expect(JSON.stringify(mine)).not.toContain(issued.issued.secret)
  })
})

/* ══════════════════════ AC-951 — the reveal surface ═════════════════════ */

describe('the reveal surface makes the consequence unmissable', () => {
  it('shows the secret once, refuses to close until acknowledged, and leaves nothing behind', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(await screen.findByRole('button', { name: 'Issue API key' }))

    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Name'), 'Warehouse export')
    await user.click(within(dialog).getByLabelText(/View analytics/))
    await user.click(within(dialog).getByRole('button', { name: 'Issue API key' }))

    /* The reveal. The secret is read out of the field rather than hard-coded:
       the mock mints it deterministically, but the test's subject is the
       CONTRACT, not the token. */
    const field = (await screen.findByLabelText('Secret')) as HTMLInputElement
    const secret = field.value
    expect(secret.startsWith('evk_live_')).toBe(true)

    /* The consequence is stated before anything can be dismissed. */
    expect(screen.getByText(/only time this key is shown/i)).toBeInTheDocument()
    /* Twice on purpose: once in the warning, once in the sentence the
       operator has to tick. */
    expect(screen.getAllByText(/cannot be shown again/i).length).toBeGreaterThan(0)

    /* §11.2 — the exit renders and is disabled in place, with its reason. */
    const done = screen.getByRole('button', { name: 'I have copied it' })
    expect(done).toBeDisabled()
    expect(screen.getByText(/only chance to copy the secret/i)).toBeInTheDocument()

    /* Escape does not discard the only copy of a live credential. */
    await user.keyboard('{Escape}')
    expect(screen.getByLabelText('Secret')).toBeInTheDocument()

    await user.click(screen.getByLabelText(/I have copied this key/))
    expect(screen.getByRole('button', { name: 'I have copied it' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'I have copied it' }))

    /* Reopening the row afterwards shows only the prefix — AC-951's second
       half, asserted on the rendered page as well as on the model. */
    await waitFor(() => expect(screen.queryByLabelText('Secret')).not.toBeInTheDocument())
    expect(document.body.textContent ?? '').not.toContain(secret)
    expect(await screen.findByText(secret.slice(0, 13))).toBeInTheDocument()

    /* And there is no control that would imply a second look is possible. */
    expect(screen.queryByRole('button', { name: /reveal|show key|show secret/i })).toBeNull()
  })
})

/* ══════════════════════ AC-952 — the delivery log ═══════════════════════ */

describe('AC-952 — a failed delivery is in the log with its reason and can be replayed', () => {
  it('carries the status code and the response body on a failed attempt', async () => {
    const log = await listWebhookDeliveries({ pageSize: 100 })
    const failed = log.items.find((delivery) => delivery.id === 'WHD-5')
    expect(failed?.state).toBe('failed')
    expect(failed?.failure?.statusCode).toBe(422)
    expect(failed?.failure?.responseBody).toContain('unknown_event_type')
  })

  it('replays into a NEW pending row and leaves the failed attempt exactly as it was', async () => {
    const before = await listWebhookDeliveries({ pageSize: 100 })
    const original = before.items.find((delivery) => delivery.id === 'WHD-5')
    expect(original?.canReplay).toBe(true)

    const replay = await replayWebhookDelivery('WHD-5')
    expect(replay.id).not.toBe('WHD-5')
    expect(replay.replayOf).toBe('WHD-5')
    expect(replay.state).toBe('pending')
    expect(replay.failure).toBeNull()

    const after = await listWebhookDeliveries({ pageSize: 100 })
    const untouched = after.items.find((delivery) => delivery.id === 'WHD-5')
    /* The rule `resendEmailDelivery` set: a log that rewrites a failure into a
       success when someone retries it is not a log. */
    expect(untouched).toEqual(original)
    expect(after.total).toBe(before.total + 1)
  })

  it('refuses a replay on a disabled endpoint, and offers it again once enabled', async () => {
    /* WHD-2 belongs to WHK-3, which is seeded disabled. */
    const disabled = await listWebhookDeliveries({ pageSize: 100 })
    expect(disabled.items.find((row_) => row_.id === 'WHD-2')?.canReplay).toBe(false)
    await expect(replayWebhookDelivery('WHD-2')).rejects.toMatchObject({ status: 409 })

    await updateWebhookEndpoint('WHK-3', { state: 'enabled' })

    const enabled = await listWebhookDeliveries({ pageSize: 100 })
    expect(enabled.items.find((row_) => row_.id === 'WHD-2')?.canReplay).toBe(true)
    const replay = await replayWebhookDelivery('WHD-2')
    expect(replay.replayOf).toBe('WHD-2')
  })

  it('refuses a replay of an attempt that did not fail', async () => {
    await expect(replayWebhookDelivery('WHD-6')).rejects.toMatchObject({ status: 409 })
    await expect(replayWebhookDelivery('WHD-7')).rejects.toMatchObject({ status: 409 })
  })

  it('derives the endpoint failure streak from the log rather than storing it', async () => {
    const endpoints = await listWebhookEndpoints()
    const failing = endpoints.find((endpoint) => endpoint.id === 'WHK-2')
    /* WHD-3, WHD-4 and WHD-5 are the three most recent attempts on WHK-2 and
       all three failed. */
    expect(failing?.consecutiveFailures).toBe(3)
    expect(endpoints.find((endpoint) => endpoint.id === 'WHK-4')?.lastDeliveryAt).toBeNull()
  })

  it('writes an audit entry naming the original and the replay', async () => {
    const replay = await replayWebhookDelivery('WHD-5')
    const log = await listAuditEntries({ subjectType: 'webhook', pageSize: 100 })
    const entry = log.items.find(
      (each) => each.detail.key === 'admin.audit.integrations.webhookReplayed',
    )
    expect(entry?.detail.params).toMatchObject({ original: 'WHD-5', replay: replay.id })
  })
})

/* ══════════════════════════ the four states ═════════════════════════════ */

describe('the four states', () => {
  it('renders the keys and the endpoints the CLIENTS return', async () => {
    renderScreen()
    expect(await screen.findByText('Billing reconciliation (nightly)')).toBeInTheDocument()
    /* The endpoint card AND the delivery log's endpoint column both name it. */
    expect((await screen.findAllByText('Corporate billing sink')).length).toBeGreaterThan(0)
  })

  it('reaches the API key error state without editing a fixture', async () => {
    mockFailures.always('integrations.keys.list')
    renderScreen()
    expect(await screen.findByText('API keys could not be loaded.')).toBeInTheDocument()
  })

  it('reaches the webhook error state without editing a fixture', async () => {
    mockFailures.always('integrations.webhooks.list')
    renderScreen()
    expect(await screen.findByText('Webhook endpoints could not be loaded.')).toBeInTheDocument()
  })

  it('reaches the delivery log error state without editing a fixture', async () => {
    mockFailures.always('integrations.deliveries.list')
    renderScreen()
    expect(await screen.findByText('The delivery log could not be loaded.')).toBeInTheDocument()
  })

  it('states the read-only refusal in place rather than hiding the controls', async () => {
    /* The Ops Manager holds no `manage_workspace`. §11.2 — disabled in place
       with a stated reason, never hidden. */
    await switchMockUser('USR-5')
    renderScreen()
    const issue = await screen.findByRole('button', { name: 'Issue API key' })
    expect(issue).toBeDisabled()
    expect(issue).toHaveAttribute('aria-describedby')
    expect((await screen.findAllByText('Your role cannot change integrations.')).length).toBeGreaterThan(0)
  })
})

/* ══════════ D30 — the two scopes no credential may ever carry ═══════════ */

/**
 * **A withdrawal that is only a comment grows back.**
 *
 * `manage_team` and `manage_security_policy` are absent from `API_KEY_SCOPES`
 * because they change **who may do things** — a credential holding either can
 * mint operators or disable the second factor, permanently, with no human in
 * the loop.
 *
 * The issuer check cannot close this. That rule binds an issuer to their own
 * authority and says nothing about an **Owner**, who holds all twenty; and a
 * machine credential is not a person — no second factor, no session lifetime,
 * and it outlives its issuer's offboarding. So the answer is a withdrawal from
 * the list rather than another clause on the check.
 *
 * The non-vacuity assertion below is the one that matters: without it, deleting
 * `API_KEY_SCOPES` entirely would make the first two expectations pass.
 */
describe('D30 — `manage_team` and `manage_security_policy` are not offerable scopes', () => {
  it('withholds exactly three, for two different reasons', () => {
    expect(API_KEY_SCOPES).not.toContain('manage_team')
    expect(API_KEY_SCOPES).not.toContain('manage_security_policy')

    /* **Derived, not hardcoded — and the derivation settled a count that prose
       had got wrong twice, in opposite directions.**

       D30 reads *"seventeen of twenty are offerable"*. `PERMISSION_KEYS` holds
       **twenty-one**: D17's twenty plus the retired `manage_settings`. So the
       offerable list is 21 − 3 = **eighteen**, and the withheld set is three,
       for **two different reasons** that must not merge:

         · `manage_team` and `manage_security_policy` — D30. They change WHO MAY
           DO THINGS, and a bearer token that mints operators or disables the
           second factor has no human in the loop.
         · `manage_settings` — D17 applied. Retired, gates no route row, so a
           credential minted against it loses its authority silently.

       Asserting the set rather than the number is what makes that legible: a
       count agrees with a sentence, a set names which keys and forces the next
       person to say which reason a fourth one falls under. */
    const withheld = PERMISSION_KEYS.filter((key) => !API_KEY_SCOPES.includes(key))
    expect([...withheld].sort()).toEqual([
      'manage_security_policy',
      'manage_settings',
      'manage_team',
    ])
    expect(API_KEY_SCOPES).toHaveLength(PERMISSION_KEYS.length - withheld.length)

    /* And it is a targeted withdrawal, not a read-only list. */
    expect(API_KEY_SCOPES).toContain('process_payouts')
    expect(API_KEY_SCOPES).toContain('manage_workspace')
  })

  /**
   * The two reasons are asserted as one set above. This is the twin that stops
   * the withdrawal from being read as "no `manage_*` key is offerable" — three
   * of them are, and a rule that swallowed all six would be a different and
   * much blunter rule than the one D30 ruled.
   */
  it('still offers the three `manage_*` keys that do not confer authority', () => {
    expect(API_KEY_SCOPES).toContain('manage_ops_policy')
    expect(API_KEY_SCOPES).toContain('manage_workspace')
    expect(API_KEY_SCOPES).toContain('manage_data_governance')
  })
})
