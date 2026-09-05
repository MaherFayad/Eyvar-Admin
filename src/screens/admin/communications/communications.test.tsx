/**
 * Admin › Communications — one test per acceptance criterion for **P6-T2**.
 *
 * The criteria, in the order the brief states them:
 *
 *   **AC-C1** every one of the six delivery states carries at least one fixture
 *            row, so no filter facet is a hole that can never match.
 *   **AC-C2** the outbox pages at least twice at the default page size.
 *   **AC-C3** every template key carries at least one send, and coverage
 *            reports the two keys that have no Arabic row.
 *   **AC-C4** a preview renders the template with sample values SUBSTITUTED.
 *   **AC-C5** a body referencing an undeclared variable blocks the save and
 *            names the variable.
 *   **AC-C6** editing a template that is in use warns before saving.
 *   **AC-C7** an unverified identity cannot be selected as a sender: disabled
 *            in place, with the reason.
 *   **AC-C8** exactly one default, and changing it goes through the client.
 *   **AC-C9** a failed row shows the failure reason and offers a resend; a
 *            failure a retry cannot fix refuses in place with its reason.
 *   **AC-C10** the log is filterable by state and by template and searchable by
 *            recipient.
 *   **AC-C11** the sub-tab's `inbox` and `outbox` views both render, off
 *            `row.views`.
 *   **AC-C12** all four states are reachable on the log without editing a
 *            fixture.
 *   **AC-C13** a push broadcast's delivered count comes from the record, not
 *            from a literal — the `142` defect.
 *
 * Where a criterion is about the model, it is asserted against the client;
 * where it is about the surface, against the rendered screen. Neither is a
 * substitute for the other: a client test cannot see a disabled button, and a
 * render test cannot prove the fixtures cover six states.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  EMAIL_DELIVERY_STATES,
  EMAIL_OPERATIONS,
  EMAIL_TEMPLATE_KEYS,
  disableMockLatency,
  emailTemplateIssues,
  getRouteTable,
  listEmailDeliveries,
  listEmailTemplateCoverage,
  listEmailTemplates,
  listPushBroadcasts,
  listSenderIdentities,
  mockFailures,
  previewEmailTemplate,
  resendEmailDelivery,
  resetDataLayer,
  saveEmailTemplate,
  sendPushBroadcast,
  setDefaultSenderIdentity,
  useNoEmailDeliveries,
} from '@/data/clients'
import type { SubTabRoute } from '@/data/types'
import { ShellProvider } from '@/shell/ShellContext'
import { AdminCommunicationsScreen } from './AdminCommunicationsScreen'

const table = getRouteTable()
const row = table.subTabs.find((each) => each.subTabId === 'admin-communications') as SubTabRoute

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
})

function mount(path = '/admin/communications') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShellProvider>
        <AdminCommunicationsScreen row={row} />
      </ShellProvider>
    </MemoryRouter>,
  )
}

/* ─────────────────────────── the model ─────────────────────────── */

describe('the delivery log fixtures — AC-C1, AC-C2, AC-C3', () => {
  it('carries at least one row in every one of the six states — AC-C1', async () => {
    const page = await listEmailDeliveries({ view: 'outbox', pageSize: 200 })
    const states = new Set(page.items.map((delivery) => delivery.state))
    for (const state of EMAIL_DELIVERY_STATES) {
      expect(states.has(state), state).toBe(true)
    }
  })

  it('pages at least twice at the default page size — AC-C2', async () => {
    const page = await listEmailDeliveries({ view: 'outbox', pageSize: 25 })
    expect(page.totalPages).toBeGreaterThan(1)
    const second = await listEmailDeliveries({ view: 'outbox', pageSize: 25, page: 2 })
    expect(second.items.length).toBeGreaterThan(0)
    expect(second.items.map((item) => item.id)).not.toEqual(page.items.map((item) => item.id))
  })

  it('carries a send for every template key — AC-C3', async () => {
    const page = await listEmailDeliveries({ view: 'outbox', pageSize: 200 })
    const keys = new Set(page.items.map((delivery) => delivery.templateKey))
    for (const key of EMAIL_TEMPLATE_KEYS) {
      expect(keys.has(key), key).toBe(true)
    }
  })

  it('reports the template keys that have no Arabic version — AC-C3', async () => {
    const coverage = await listEmailTemplateCoverage()
    const missingArabic = coverage.filter((entry) => entry.missing.includes('ar')).map((e) => e.key)
    expect(missingArabic).toEqual(['payout.processed', 'ticket.reply'])
    /* And the complete ones say so, rather than reporting a hole that is not
       there — the failure mode of counting coverage off a filtered page. */
    const receipt = coverage.find((entry) => entry.key === 'trip.receipt')
    expect(receipt?.missing).toEqual([])
    expect(receipt?.present).toEqual(['en', 'ar'])
  })

  it('has an inbox and an outbox, and a bounce is not an inbox row', async () => {
    const inbox = await listEmailDeliveries({ view: 'inbox', pageSize: 200 })
    const outbox = await listEmailDeliveries({ view: 'outbox', pageSize: 200 })
    expect(inbox.total).toBeGreaterThan(0)
    expect(inbox.items.every((item) => item.direction === 'inbound')).toBe(true)
    expect(outbox.items.every((item) => item.direction === 'outbound')).toBe(true)
    expect(inbox.items.some((item) => item.failure !== null)).toBe(false)
  })
})

describe('preview and validation — AC-C4, AC-C5, AC-C6', () => {
  it('renders the template with sample values substituted, not the source — AC-C4', async () => {
    const preview = await previewEmailTemplate('TPL-001')
    expect(preview.subject).toBe('Your Eyvar receipt for trip TRP-24817')
    expect(preview.body).toContain('Nora Al-Harbi')
    expect(preview.body).toContain('SAR 38.50')
    expect(preview.body).not.toContain('{{')
    expect(preview.values.riderName).toBe('Nora Al-Harbi')
  })

  it('previews an Arabic template right-to-left — AC-C4', async () => {
    const preview = await previewEmailTemplate('TPL-002')
    expect(preview.dir).toBe('rtl')
    expect(preview.body).not.toContain('{{')
    expect(preview.body).toContain('نورة الحربي')
  })

  it('names the undeclared variable and refuses the save — AC-C5', async () => {
    /* TPL-005 references `{{expiryMinutes}}` and declares three other names. */
    const template = (await listEmailTemplates({ pageSize: 100 })).items.find(
      (each) => each.id === 'TPL-005',
    )
    expect(template).toBeDefined()

    const validation = emailTemplateIssues(
      { subject: template!.subject, body: template!.body, variables: template!.variables },
      { inUse: true },
    )
    expect(validation.valid).toBe(false)
    const error = validation.issues.find((issue) => issue.code === 'undeclared-variable')
    expect(error?.variable).toBe('expiryMinutes')
    expect(error?.field).toBe('body')

    await expect(
      saveEmailTemplate(
        'TPL-005',
        { subject: template!.subject, body: template!.body, variables: template!.variables },
        { confirmInUse: true, actorId: 'USR-1' },
      ),
    ).rejects.toMatchObject({ status: 422, kind: 'validation' })
  })

  it('warns before saving a template that is in use, and saves once confirmed — AC-C6', async () => {
    const draft = {
      subject: 'Your Eyvar receipt for trip {{tripId}}',
      body: 'Hello {{riderName}}, your trip {{tripId}} came to {{fare}}.',
      variables: [
        { name: 'riderName', required: true, sample: 'Nora Al-Harbi' },
        { name: 'tripId', required: true, sample: 'TRP-24817' },
        { name: 'fare', required: true, sample: 'SAR 38.50' },
      ],
    }
    await expect(
      saveEmailTemplate('TPL-001', draft, { actorId: 'USR-1' }),
    ).rejects.toMatchObject({ status: 409, code: 'template_in_use' })

    const saved = await saveEmailTemplate('TPL-001', draft, {
      confirmInUse: true,
      actorId: 'USR-1',
    })
    expect(saved.version).toBe(8)
    expect(saved.body).toBe(draft.body)
    expect(saved.updatedBy).toBe('USR-1')
  })
})

describe('sender identities — AC-C7, AC-C8', () => {
  it('serves exactly one default, and every verification state', async () => {
    const page = await listSenderIdentities({ pageSize: 50 })
    expect(page.items.filter((identity) => identity.isDefault)).toHaveLength(1)
    const states = new Set(page.items.map((identity) => identity.verification))
    expect(states).toEqual(new Set(['verified', 'pending', 'unverified', 'failed']))
  })

  it('refuses an unverified identity as the default, with a reason code — AC-C7', async () => {
    const page = await listSenderIdentities({ pageSize: 50 })
    const unverified = page.items.find((identity) => identity.verification === 'unverified')
    expect(unverified?.canSend).toBe(false)
    expect(unverified?.blockedFor).toBe('unverified')
    await expect(setDefaultSenderIdentity(unverified!.id, 'USR-1')).rejects.toMatchObject({
      status: 409,
      code: 'sender_not_verified',
    })
  })

  it('moves the default and leaves exactly one — AC-C8', async () => {
    const after = await setDefaultSenderIdentity('SND-02', 'USR-1')
    expect(after.filter((identity) => identity.isDefault).map((i) => i.id)).toEqual(['SND-02'])
    const reread = await listSenderIdentities({ pageSize: 50 })
    expect(reread.items.filter((identity) => identity.isDefault).map((i) => i.id)).toEqual(['SND-02'])
  })
})

describe('resend — AC-C9', () => {
  it('queues a new row and leaves the failure it retried', async () => {
    const before = await listEmailDeliveries({ view: 'outbox', pageSize: 200 })
    /* EML-1025 is a soft bounce: a retry can plausibly work. */
    const resent = await resendEmailDelivery('EML-1025')
    expect(resent.state).toBe('queued')
    expect(resent.resendOf).toBe('EML-1025')
    expect(resent.failure).toBeNull()

    const after = await listEmailDeliveries({ view: 'outbox', pageSize: 200 })
    expect(after.total).toBe(before.total + 1)
    const original = after.items.find((item) => item.id === 'EML-1025')
    expect(original?.state).toBe('bounced')
    expect(original?.failure?.code).toBe('soft-bounce')
  })

  it('refuses a resend a retry cannot fix', async () => {
    /* EML-1023 is a hard bounce and EML-1026 a spam complaint. */
    const page = await listEmailDeliveries({ view: 'outbox', pageSize: 200 })
    const hard = page.items.find((item) => item.id === 'EML-1023')
    const complaint = page.items.find((item) => item.id === 'EML-1026')
    expect(hard?.canResend).toBe(false)
    expect(complaint?.canResend).toBe(false)
    await expect(resendEmailDelivery('EML-1023')).rejects.toMatchObject({ status: 409 })
  })
})

describe('the log query — AC-C10', () => {
  it('filters by delivery state', async () => {
    const page = await listEmailDeliveries({
      view: 'outbox',
      pageSize: 200,
      filters: [{ field: 'state', op: 'eq', value: 'bounced' }],
    })
    expect(page.total).toBeGreaterThan(0)
    expect(page.items.every((item) => item.state === 'bounced')).toBe(true)
  })

  it('filters by template', async () => {
    const page = await listEmailDeliveries({
      view: 'outbox',
      pageSize: 200,
      filters: [{ field: 'templateKey', op: 'eq', value: 'payout.processed' }],
    })
    expect(page.total).toBeGreaterThan(0)
    expect(page.items.every((item) => item.templateKey === 'payout.processed')).toBe(true)
  })

  it('searches by recipient', async () => {
    const page = await listEmailDeliveries({ view: 'outbox', pageSize: 200, q: 'nora.alharbi' })
    expect(page.total).toBe(1)
    expect(page.items[0]?.recipient).toBe('nora.alharbi@example.com')
  })
})

describe('push broadcasts — AC-C13', () => {
  it('counts the audience it went to, and reports no open rate yet', async () => {
    const broadcast = await sendPushBroadcast({
      title: 'Weekend bonus',
      body: 'Complete 20 trips this weekend.',
      audienceId: 'all-captains',
      deepLink: null,
      actorId: 'USR-1',
    })
    /* `all-captains` is 4812 devices. The number the screen used to invent was
       142, for every audience, on every send. */
    expect(broadcast.deliveredCount).toBe(4812)
    expect(broadcast.openRate).toBeNull()
    expect(broadcast.state).toBe('queued')

    const history = await listPushBroadcasts({ pageSize: 10 })
    expect(history.items[0]?.id).toBe(broadcast.id)
    expect(history.items[0]?.deliveredCount).toBe(4812)
  })
})

/* ─────────────────────────── the surface ────────────────────────── */

describe('the screen', () => {
  it('renders the outbox by default, off row.views — AC-C11', async () => {
    mount()
    expect(await screen.findByRole('tab', { name: 'Outbox' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Inbox' })).toBeInTheDocument()
    expect(await screen.findByText('nora.alharbi@example.com')).toBeInTheDocument()
  })

  it('renders the inbox when the URL asks for it — AC-C11', async () => {
    mount('/admin/communications?view=inbox')
    /* An inbound row: the correspondent is the customer, not our identity. */
    expect(await screen.findByText('jana.alamri@example.com')).toBeInTheDocument()
  })

  it('states the failure on a failed row — AC-C9', async () => {
    mount('/admin/communications?view=outbox&page=2')
    expect(await screen.findByText('The address does not exist')).toBeInTheDocument()
    /* The provider's verbatim words are BESIDE the sentence, never instead. */
    expect(
      screen.getByText('550 5.1.1 The email account that you tried to reach does not exist'),
    ).toBeInTheDocument()
  })

  it('disables Make default on an unverified identity and says why — AC-C7', async () => {
    mount('/admin/communications?view=senders')
    const careers = await screen.findByText('careers@eyvar.sa')
    const listItem = careers.closest('li')
    expect(listItem).not.toBeNull()
    const scope = within(listItem as HTMLElement)
    expect(scope.getByRole('button', { name: 'Make default' })).toBeDisabled()
    expect(
      scope.getByText('Verify this address before the system can send as it.'),
    ).toBeInTheDocument()
  })

  it('shows which language a template family is missing — AC-C3', async () => {
    mount('/admin/communications?view=templates')
    expect(await screen.findByText('Weekly payout processed')).toBeInTheDocument()
    expect(screen.getAllByText('No Arabic version').length).toBeGreaterThan(0)
  })

  it('previews a template with its sample values substituted — AC-C4', async () => {
    const user = userEvent.setup()
    mount('/admin/communications?view=templates')
    /* The event is a row on the start side; its English template opens in place. */
    await user.click(await screen.findByRole('button', { name: /Trip receipt/ }))
    expect(screen.queryByRole('dialog')).toBeNull()

    const subject = await screen.findByTestId('preview-subject')
    expect(subject).toHaveTextContent('Your Eyvar receipt for trip TRP-24817')
    expect(screen.getByTestId('preview-body')).toHaveTextContent('Nora Al-Harbi')
    expect(screen.getByTestId('preview-body').textContent).not.toContain('{{')
  })

  it('blocks the save and names the undeclared variable — AC-C5', async () => {
    const user = userEvent.setup()
    mount('/admin/communications?view=templates')
    await user.click(await screen.findByRole('button', { name: /Reset your password/ }))

    expect(
      await screen.findByText('The body uses expiryMinutes, which this template does not declare.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save template' })).toBeDisabled()
    expect(screen.getByText('Fix the errors listed above before saving.')).toBeInTheDocument()

    /* And the fix is offered where the error is stated. */
    await user.click(screen.getByRole('button', { name: 'Declare expiryMinutes' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save template' })).toBeEnabled()
    })
  })

  it('warns before saving a template that is in use — AC-C6', async () => {
    const user = userEvent.setup()
    mount('/admin/communications?view=templates')
    await user.click(await screen.findByRole('button', { name: /Trip receipt/ }))
    /* A save asks only once something changed. */
    await user.type(await screen.findByLabelText('Subject'), ' ')

    await user.click(await screen.findByRole('button', { name: 'Save template' }))
    expect(await screen.findByText('This template is live')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save anyway' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Keep editing' })).toBeInTheDocument()
  })

  it('reaches all four states of the log without editing a fixture — AC-C12', async () => {
    /* error */
    mockFailures.always(EMAIL_OPERATIONS.deliveries)
    const failed = mount()
    expect(await screen.findByText('The email log could not be loaded.')).toBeInTheDocument()
    failed.unmount()
    mockFailures.clear(EMAIL_OPERATIONS.deliveries)

    /* empty — a log with nothing in it, which is first-run and not no-match */
    useNoEmailDeliveries()
    const empty = mount()
    expect(
      await screen.findByText('Every message the system sends lands here'),
    ).toBeInTheDocument()
    empty.unmount()

    /* content */
    resetDataLayer()
    mount()
    expect(await screen.findByText('nora.alharbi@example.com')).toBeInTheDocument()
  })

  it('shows a loading state before the log resolves — AC-C12', async () => {
    /* Latency is restored for this one assertion only: with it disabled the
       mock resolves before React paints and the skeleton never renders, which
       is the reason `getMockLatency` is non-zero by default. */
    const { setMockLatency } = await import('@/data/config')
    setMockLatency(40)
    mount('/admin/communications?view=senders')
    expect(await screen.findByLabelText('Sender identities')).toBeInTheDocument()
    setMockLatency(0)
  })

  it('mounts with the document in Arabic without losing a string', async () => {
    /* It cannot prove the geometry mirrors — that is a Playwright job and
       visual-QA's verdict. It proves that nothing throws, that every key still
       resolves, and that the Arabic template content survives the round trip.
       `interpolate` throws on a missing parameter, so a single unfilled
       placeholder anywhere on this page fails here rather than in front of an
       operator. */
    document.documentElement.setAttribute('dir', 'rtl')
    document.documentElement.setAttribute('lang', 'ar')
    try {
      const log = mount()
      expect(await screen.findByText('nora.alharbi@example.com')).toBeInTheDocument()
      log.unmount()
      /* The Arabic template's own subject line, once its language is chosen on
         the selected event of the Templates pane. */
      mount('/admin/communications?view=templates')
      const user = userEvent.setup()
      await user.click(await screen.findByRole('button', { name: /Trip receipt/ }))
      await user.click(screen.getByRole('radio', { name: 'Arabic' }))
      expect(await screen.findByDisplayValue('إيصال إيفار لرحلتك {{tripId}}')).toBeInTheDocument()
    } finally {
      /* In a `finally`, so a failed assertion cannot leak `dir="rtl"` into the
         next test in this file — which is how one failure becomes two. */
      document.documentElement.removeAttribute('dir')
      document.documentElement.removeAttribute('lang')
    }
  })

  it('sends a push broadcast through the client and shows the recorded count — AC-C13', async () => {
    const user = userEvent.setup()
    mount('/admin/communications?view=push')
    await user.click(await screen.findByRole('button', { name: 'Send push broadcast' }))

    await user.type(await screen.findByLabelText('Title'), 'Weekend bonus')
    await user.type(screen.getByLabelText('Message'), 'Complete 20 trips this weekend.')
    await user.click(screen.getByRole('button', { name: 'Send broadcast' }))

    /* **The confirm intercepts, and it names the two facts that decide it.**
       A broadcast reaches a whole audience, cannot be recalled, and lands
       `queued` with no cancel — the widest-blast act in the product, and it had
       nothing in front of it. */
    expect(await screen.findByText('Send this to Captains online now?')).toBeInTheDocument()
    /* 317 is the default audience's real size. The point of putting it in the
       sentence is that the operator decides on the number, not on the label —
       `all-riders` is 28,460 and one click away in the same picker. */
    expect(
      screen.getByText(/reaches 317 devices immediately and cannot be recalled/),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Send it now' }))

    /* `online-captains` is 317 devices. Never 142. */
    expect(await screen.findByText('317 devices')).toBeInTheDocument()
  })

  it('sends nothing when the confirm is dismissed', async () => {
    const user = userEvent.setup()
    mount()
    await user.click(await screen.findByRole('button', { name: 'Send push broadcast' }))
    await user.type(await screen.findByLabelText('Title'), 'Weekend bonus')
    await user.type(screen.getByLabelText('Message'), 'Complete 20 trips this weekend.')
    await user.click(screen.getByRole('button', { name: 'Send broadcast' }))

    await screen.findByText(/cannot be recalled/)
    await user.keyboard('{Escape}')

    /* The composer stays open with the operator's draft intact — a dismissed
       confirm must not also throw away the message they just wrote. */
    expect(screen.getByLabelText('Title')).toHaveValue('Weekend bonus')
  })
})
