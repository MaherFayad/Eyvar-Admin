/**
 * The re-authentication modal and the device list — `specs/04` §13.4, §13.9.
 *
 * The two tests that matter most here are both **inventories, not searches**:
 *
 * - **AC-567 (a)** enumerates every focusable element inside the dialog and
 *   fails on anything not on a closed list. Spec §19.2 explains why it has to
 *   be shaped that way: *"a QA engineer cannot enumerate the controls that
 *   might one day be added and confirm that none of them is an identifier."* A
 *   closed inventory can be diffed where an open search cannot.
 * - **`isDeviceTrusted`, never `trustedUntil !== null`.** `USR-3`'s row is
 *   seeded **four days expired** precisely to catch a null-check, and a screen
 *   that renders `Trusted until {date}` on any non-null value shows a date that
 *   has already gone by.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { disableMockLatency, resetDataLayer } from '@/data/clients'
import * as authClient from '@/data/clients/auth'
import type { DeviceSession } from '@/data/types/auth'
import { EN } from '@/i18n/dictionaries'
import { createTranslator } from '@/lib'
import { DeviceList } from './DeviceList'
import { ReauthModal } from './ReauthModal'
import { SignOutDirtyDialog } from '@/shell/SignOutDirtyDialog'

const t = createTranslator({ dictionary: EN, fallback: EN })
const en = (key: string) => EN[key] as string
/**
 * **Every spy below is given an implementation, and that is not a style
 * choice.**
 *
 * These surfaces import from the `@/data/clients` barrel, which re-exports with
 * `export { verifyCode } from './auth'` — a **live binding**. `vi.spyOn` swaps
 * the property on the `./auth` namespace object, and a bare
 * `vi.spyOn(authClient, 'verifyCode')` with no implementation does **not**
 * intercept what the barrel hands the component: the component keeps calling
 * the original and the spy records nothing.
 *
 * The consequence is worth stating, because it is the exact shape of a false
 * tick. A **positive** assertion (`toHaveBeenCalled`) fails loudly — which is
 * how this was found. A **negative** one (`not.toHaveBeenCalled`) passes
 * **vacuously**: it asserts nothing at all while reading as the strongest check
 * on the page. Three assertions here were in that state, and **AC-504**'s
 * *"does not issue a network request"* was one of them.
 *
 * So: **a spy with an implementation, always**, even where the implementation
 * only has to reject. The interception is what makes the assertion mean
 * anything.
 */


beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
  /* `vitest` does not restore spies between tests unless asked, and several
     below hold a client in a state the next one must not inherit — a rejection,
     a promise that never resolves, an arm that is not the default. A leaked one
     turns a later assertion into "the surface rendered something else", which
     is a failure that names the wrong thing. */
  vi.restoreAllMocks()
})

function renderModal(overrides: Partial<React.ComponentProps<typeof ReauthModal>> = {}) {
  const props: React.ComponentProps<typeof ReauthModal> = {
    open: true,
    t,
    email: 'fahad@eyvar.com',
    reason: 'idle',
    dirtyEntity: 'payout adjustment',
    online: true,
    onResumed: vi.fn(),
    onSignOut: vi.fn(),
    ...overrides,
  }
  return { props, ...render(<ReauthModal {...props} />) }
}

/* ═══════════════════════ AC-567 — the closed inventory ══════════════════ */

describe('AC-567 (a) — "the complete set of controls inside the modal is exactly this list"', () => {
  it('renders no identifier field of any kind, and the account is static text', async () => {
    renderModal()
    const dialog = await screen.findByRole('alertdialog')

    /* Every `<input>`, `<select>`, `<textarea>` and `contenteditable` inside
       the dialog. **An `input` of any type other than `password` fails
       outright** — that is the criterion's own wording, and it is what makes
       the absence testable in the direction that matters. */
    const inputs = Array.from(
      dialog.querySelectorAll<HTMLInputElement>('input, select, textarea, [contenteditable]'),
    ).filter((element) => element.getAttribute('aria-hidden') !== 'true')

    expect(inputs).toHaveLength(1)
    expect(inputs[0]).toHaveAttribute('type', 'password')

    /* The account is rendered as TEXT, bound to the expired session's identity.
       A refusal is a check that can be forgotten; an absent field cannot be. */
    const account = within(dialog).getByText(/fahad@eyvar\.com/)
    expect(account.closest('input')).toBeNull()
    expect(account.closest('[contenteditable]')).toBeNull()
  })

  it('offers exactly the five permitted controls and nothing else', async () => {
    renderModal()
    const dialog = await screen.findByRole('alertdialog')

    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>('button, input, a[href], select, textarea'),
    ).filter((el) => el.getAttribute('aria-hidden') !== 'true' && el.tabIndex >= 0)

    /* The closed list: the password field, its reveal, `Sign out`, `Sign in`.
       The account line is static and is therefore NOT in this set — which is
       the whole point. */
    expect(focusable).toHaveLength(4)
    expect(within(dialog).getByLabelText(en('auth.field.password'))).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: en('auth.field.showPassword') })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: en('auth.signOut') })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: en('auth.reauth.submit') })).toBeInTheDocument()
  })

  it('sends a payload with no operator-supplied identity — AC-567 (b)', async () => {
    const user = userEvent.setup()
    const reauth = vi
      .spyOn(authClient, 'reauthenticate')
      .mockResolvedValue({ kind: 'failed', reason: 'rejected', lockedUntil: null })
    renderModal()

    await user.type(await screen.findByLabelText(en('auth.field.password')), 'secret')
    await user.click(screen.getByRole('button', { name: en('auth.reauth.submit') }))

    await waitFor(() => expect(reauth).toHaveBeenCalled())
    const payload = reauth.mock.calls[0]?.[0] as unknown as Record<string, unknown>
    expect(Object.keys(payload)).toEqual(['password'])
    /* No `email`, no `userId`, no `identifier`. Structural rather than
       conditional: the type has no field for one either. */
    expect(payload).not.toHaveProperty('email')
    expect(payload).not.toHaveProperty('userId')
    reauth.mockRestore()
  })
})

describe('§8.2 — the modal cannot be dismissed', () => {
  it('does not close on Escape', async () => {
    const user = userEvent.setup()
    renderModal()
    await screen.findByRole('alertdialog')
    await user.keyboard('{Escape}')
    /* A dismissable freeze is a freeze that can be walked past. There is also
       no close `✕`: nothing to dismiss to. */
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /close/i })).toBeNull()
  })
})

describe('AC-560 — the two expiry reasons are visibly distinct, here too', () => {
  it('names the 12-hour limit for an absolute expiry', async () => {
    renderModal({ reason: 'absolute' })
    expect(
      await screen.findByText(en('auth.session.endedAbsolute.title')),
    ).toBeInTheDocument()
    expect(screen.queryByText(en('auth.reauth.title'))).toBeNull()
  })
})

describe('§8.3 — "Sign out while dirty swaps the modal\'s own body, in place"', () => {
  it('replaces the body with the confirmation rather than nesting a second modal', async () => {
    const user = userEvent.setup()
    renderModal()
    await user.click(await screen.findByRole('button', { name: en('auth.signOut') }))

    /* One modal, two bodies. §5.5 forbids a modal nested inside another
       surface, so there is exactly one `alertdialog` in the document. */
    expect(screen.getAllByRole('alertdialog')).toHaveLength(1)
    expect(screen.getByText(en('auth.reauth.signOutConfirm.title'))).toBeInTheDocument()
    /* `{entity}` comes from the SaveBar's own dirty label, so the two surfaces
       name the same object (`copy.md` rule 5). */
    expect(screen.getByText(/payout adjustment/)).toBeInTheDocument()
    /* The password field is gone while the confirmation is up. */
    expect(screen.queryByLabelText(en('auth.field.password'))).toBeNull()
  })

  it('returns to the password body on Cancel, with the field cleared', async () => {
    const user = userEvent.setup()
    renderModal()
    await user.type(await screen.findByLabelText(en('auth.field.password')), 'typed')
    await user.click(screen.getByRole('button', { name: en('auth.signOut') }))
    await user.click(screen.getByRole('button', { name: en('common.cancel') }))

    const field = await screen.findByLabelText(en('auth.field.password'))
    expect(field).toHaveValue('')
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('signs out directly when nothing is dirty — there is nothing to confirm', async () => {
    const user = userEvent.setup()
    const { props } = renderModal({ dirtyEntity: null })
    await user.click(await screen.findByRole('button', { name: en('auth.signOut') }))
    expect(props.onSignOut).toHaveBeenCalled()
    expect(screen.queryByText(en('auth.reauth.signOutConfirm.title'))).toBeNull()
  })
})

describe('AC-574 — "a transport failure keeps the app mounted and the dirty form intact"', () => {
  it('shows the error with a retry inside the modal', async () => {
    const user = userEvent.setup()
    const reauth = vi.spyOn(authClient, 'reauthenticate').mockRejectedValue(new Error('down'))
    renderModal()
    await user.type(await screen.findByLabelText(en('auth.field.password')), 'secret')
    await user.click(screen.getByRole('button', { name: en('auth.reauth.submit') }))

    expect(await screen.findByText(en('auth.error.reauth.title'))).toBeInTheDocument()
    expect(screen.getByText(en('auth.error.reauth.body'))).toBeInTheDocument()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    reauth.mockRestore()
  })
})

describe('§2.5 — the in-flight state, in the modal too', () => {
  it('makes the password readOnly and NOT disabled', async () => {
    const user = userEvent.setup()
    const reauth = vi.spyOn(authClient, 'reauthenticate').mockReturnValue(new Promise(() => {}))
    renderModal()
    const field = await screen.findByLabelText(en('auth.field.password'))
    await user.type(field, 'secret')
    await user.click(screen.getByRole('button', { name: en('auth.reauth.submit') }))

    await waitFor(() => expect(field).toHaveAttribute('readonly'))
    expect(field).not.toBeDisabled()
    reauth.mockRestore()
  })
})

/* ═══════════════════════ the device list — §9 ═══════════════════════════ */

/**
 * The mock's fixed clock (`EYVAR_NOW`, `2026-06-25T09:14+03:00`). Every date
 * below is expressed relative to it, because `isDeviceTrusted` compares against
 * that instant and not against the wall clock — which is what makes the
 * expired-trust case deterministic rather than a test that starts failing on a
 * particular Tuesday.
 */
const NOW = '2026-06-25T09:14:00+03:00'
const FOUR_DAYS_AGO = '2026-06-21T09:14:00+03:00'
const NEXT_MONTH = '2026-07-25T09:14:00+03:00'

function device(overrides: Partial<DeviceSession> = {}): DeviceSession {
  return {
    id: 'DEV-1',
    device: 'Chrome on Windows',
    location: 'Riyadh',
    ip: '176.44.2.19',
    lastActiveAt: NOW,
    isCurrent: true,
    trustedUntil: null,
    ...overrides,
  }
}

describe('§9 — "isDeviceTrusted, never trustedUntil !== null"', () => {
  it('renders `Not trusted` for a device whose trust has EXPIRED', async () => {
    const list = vi.spyOn(authClient, 'listDevices').mockResolvedValue([
      /* Four days in the past — the exact shape `USR-3` is seeded with, and
         the exact case a `!== null` check gets wrong. */
      device({ trustedUntil: FOUR_DAYS_AGO }),
    ])
    render(<DeviceList t={t} language="en" />)

    expect(await screen.findByText(en('auth.devices.notTrusted'))).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: en('auth.devices.stopTrusting') })).toBeNull()
    list.mockRestore()
  })

  it('renders `Trusted until {date}` only while the trust is live', async () => {
    const list = vi
      .spyOn(authClient, 'listDevices')
      .mockResolvedValue([device({ trustedUntil: NEXT_MONTH })])
    render(<DeviceList t={t} language="en" />)

    expect(await screen.findByText(/Trusted until/)).toBeInTheDocument()
    /* **AC-571** — `Stop trusting` takes no confirmation: recoverable, cheap,
       and the line changes immediately. */
    expect(screen.getByRole('button', { name: en('auth.devices.stopTrusting') })).toBeInTheDocument()
    list.mockRestore()
  })
})

describe('§9 — "one badge per row, maximum"', () => {
  it('gives the current device one neutral badge and no second one', async () => {
    const list = vi
      .spyOn(authClient, 'listDevices')
      .mockResolvedValue([device({ trustedUntil: NEXT_MONTH })])
    const { container } = render(<DeviceList t={t} language="en" />)
    await screen.findByText(en('auth.devices.thisDevice'))

    /* Trusted state is carried by the LINE, never by a second badge — two
       badges on a 13px row is where a list stops being scannable. */
    expect(container.querySelectorAll('[data-slot="badge"]')).toHaveLength(1)
    list.mockRestore()
  })

  it('isolates the IP as an LTR run', async () => {
    const list = vi.spyOn(authClient, 'listDevices').mockResolvedValue([device()])
    const { container } = render(<DeviceList t={t} language="en" />)
    await screen.findByText('176.44.2.19')
    const bdi = container.querySelector('bdi')
    expect(bdi).toHaveAttribute('dir', 'ltr')
    expect(bdi?.textContent).toBe('176.44.2.19')
    list.mockRestore()
  })
})

describe('AC-651 / AC-652 / AC-653 — the four states', () => {
  it('renders a SKELETON, not a spinner, while the list is in flight', async () => {
    const list = vi.spyOn(authClient, 'listDevices').mockReturnValue(new Promise(() => {}))
    const { container } = render(<DeviceList t={t} language="en" />)
    await waitFor(() =>
      expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0),
    )
    expect(container.querySelector('[data-slot="spinner"]')).toBeNull()
    list.mockRestore()
  })

  it('renders a CARD-scoped error with a retry, leaving the rest of the layer alone', async () => {
    const list = vi.spyOn(authClient, 'listDevices').mockRejectedValue(new Error('down'))
    render(<DeviceList t={t} language="en" />)
    expect(await screen.findByText(en('auth.devices.error'))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: en('auth.tryAgain') })).toBeInTheDocument()
    /* The card's own heading is still there — the failure is scoped to the
       list, not to the layer. */
    expect(screen.getByText(en('auth.devices.title'))).toBeInTheDocument()
    list.mockRestore()
  })

  it('renders ONE GREY SENTENCE for an empty list, and no illustration', async () => {
    const list = vi.spyOn(authClient, 'listDevices').mockResolvedValue([])
    const { container } = render(<DeviceList t={t} language="en" />)
    expect(await screen.findByText(en('auth.devices.empty'))).toBeInTheDocument()
    /* R8 — `no-match`, not `first-run`. Sessions are not something an operator
       creates, so an illustration implying "make the first one" is a lie. */
    expect(container.querySelector('svg[viewBox="0 0 160 96"]')).toBeNull()
    list.mockRestore()
  })
})

describe('AC-576 — "Sign out everywhere states how many sessions will end before it acts"', () => {
  it('expands in place with the count, and does not act until confirmed', async () => {
    const user = userEvent.setup()
    const list = vi
      .spyOn(authClient, 'listDevices')
      .mockResolvedValue([device(), device({ id: 'DEV-2', isCurrent: false }), device({ id: 'DEV-3', isCurrent: false })])
    const everywhere = vi
      .spyOn(authClient, 'signOutEverywhere')
      .mockRejectedValue(new Error('AC-576: nothing acts before the confirmation'))
    render(<DeviceList t={t} language="en" />)

    await user.click(await screen.findByRole('button', { name: en('auth.devices.signOutAll') }))

    /* Two OTHER sessions — `isCurrent` is the one row that is not "other". The
       confirmation **expands in place**: §5.5 forbids a modal nested inside a
       no-scrim drawer, so there is no dialog anywhere. */
    expect(screen.getByText(/2 other sessions will end/)).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(everywhere).not.toHaveBeenCalled()
    list.mockRestore()
    everywhere.mockRestore()
  })
})

describe('D-A9 — the per-row confirmation replaces the native confirm()', () => {
  it('expands the row instead of opening a dialog, and names the device', async () => {
    const user = userEvent.setup()
    const list = vi
      .spyOn(authClient, 'listDevices')
      .mockResolvedValue([device(), device({ id: 'DEV-2', device: 'Safari on iPhone', isCurrent: false })])
    render(<DeviceList t={t} language="en" />)

    const rowButtons = await screen.findAllByRole('button', { name: en('auth.devices.signOut') })
    await user.click(rowButtons[0] as HTMLElement)

    /* The device name sits inside a `<bdi>`, so the sentence spans three text
       nodes — which is the isolation working, not a defect. Matched on the
       block's own `textContent` rather than with a text matcher that would
       force the copy back into one node and lose the isolation. */
    expect(screen.getByText(en('auth.devices.signOutConfirmBody')).parentElement?.textContent)
      .toContain('Sign out of Safari on iPhone?')
    expect(screen.getByText(en('auth.devices.signOutConfirmBody'))).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).toBeNull()
    list.mockRestore()
  })

  it('offers no per-row sign out for the CURRENT device', async () => {
    const list = vi.spyOn(authClient, 'listDevices').mockResolvedValue([device()])
    render(<DeviceList t={t} language="en" />)
    await screen.findByText(en('auth.devices.thisDevice'))
    /* Signing yourself out of the session you are using is `auth.signOut`, not
       a device revocation — the client answers 409 for exactly this, and the
       surface does not offer the control in the first place (**AC-667**: gate
       at render, never enabled-then-refused). */
    expect(screen.queryByRole('button', { name: en('auth.devices.signOut') })).toBeNull()
    list.mockRestore()
  })
})

/* ═══════════════ AC-573 — the code step, in this same modal ═══════════ */

const MODAL_CHALLENGE = {
  kind: 'challenge' as const,
  challengeId: 'CHL-R1',
  secondFactor: { method: 'sms' as const, hint: '••••••67' },
  expiresAt: '2026-06-25T09:24:00+03:00',
  resendAvailableAt: '2000-01-01T00:00:00.000Z',
}

async function reachCodeBody(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText(en('auth.field.password')), 'secret')
  await user.click(screen.getByRole('button', { name: en('auth.reauth.submit') }))
  return screen.findByLabelText(en('auth.otp.label'))
}

describe('AC-573 — an untrusted device asks for the password AND a code', () => {
  it('swaps the SAME modal\'s body, with no second dialog and no route change', async () => {
    const user = userEvent.setup()
    const reauth = vi.spyOn(authClient, 'reauthenticate').mockResolvedValue(MODAL_CHALLENGE)
    renderModal()
    await reachCodeBody(user)

    /* One modal, three bodies. §5.5 forbids a modal nested inside another
       surface, so a body swap is the only shape available — and it is also the
       right one: the operator never loses the scrim or the trap. */
    expect(screen.getAllByRole('alertdialog')).toHaveLength(1)
    expect(screen.getByText(en('auth.reauth.code.title'))).toBeInTheDocument()
    /* The password field is gone; the code field has taken its place. */
    expect(screen.queryByLabelText(en('auth.field.password'))).toBeNull()
    reauth.mockRestore()
  })

  it('renders ONE centred LTR input, not six boxes, and the masked hint', async () => {
    const user = userEvent.setup()
    const reauth = vi.spyOn(authClient, 'reauthenticate').mockResolvedValue(MODAL_CHALLENGE)
    renderModal()
    const field = await reachCodeBody(user)

    /* The same field as `/signin/verify`, because it is the same six digits —
       a second implementation is a second set of paste rules. */
    expect(screen.getAllByRole('textbox')).toHaveLength(1)
    expect(field).toHaveAttribute('dir', 'ltr')
    expect(field).toHaveAttribute('autocomplete', 'one-time-code')
    expect(field.className).toContain('text-center')

    const dialog = screen.getByRole('alertdialog')
    const bdi = dialog.querySelector('bdi')
    expect(bdi).toHaveAttribute('dir', 'ltr')
    expect(bdi?.textContent).toBe('••••••67')
    reauth.mockRestore()
  })

  it('keeps `Sign out` in the footer — §8.2\'s named path to a different account', async () => {
    const user = userEvent.setup()
    const reauth = vi.spyOn(authClient, 'reauthenticate').mockResolvedValue(MODAL_CHALLENGE)
    renderModal()
    await reachCodeBody(user)

    expect(screen.getByRole('button', { name: en('auth.signOut') })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: en('auth.otp.submit') })).toBeInTheDocument()
    /* There is still no identifier field anywhere in the dialog — AC-567 (a)
       holds through the swap, which is the point of checking it here too. */
    const inputs = Array.from(
      screen.getByRole('alertdialog').querySelectorAll<HTMLInputElement>('input'),
    ).filter((element) => element.getAttribute('aria-hidden') !== 'true')
    expect(inputs).toHaveLength(1)
    expect(inputs[0]).toHaveAttribute('inputmode', 'numeric')
    reauth.mockRestore()
  })

  it('verifies through the ORDINARY verifyCode, and resumes on success', async () => {
    const user = userEvent.setup()
    const reauth = vi.spyOn(authClient, 'reauthenticate').mockResolvedValue(MODAL_CHALLENGE)
    const verify = vi
      .spyOn(authClient, 'verifyCode')
      .mockResolvedValue({ kind: 'signed-in', session: {} as never })
    const { props } = renderModal()
    const field = await reachCodeBody(user)

    field.focus()
    await user.keyboard('123456')
    await waitFor(() => expect(field).toHaveValue('123456'))
    await user.click(screen.getByRole('button', { name: en('auth.otp.submit') }))

    await waitFor(() => expect(verify).toHaveBeenCalled())
    /* No second pair of operations for the same six digits: that would be a
       second attempt counter and a second cooldown schedule. */
    expect(verify.mock.calls[0]?.[0]).toMatchObject({ challengeId: 'CHL-R1', code: '123456' })
    await waitFor(() => expect(props.onResumed).toHaveBeenCalled())
    reauth.mockRestore()
    verify.mockRestore()
  })

  it('does not submit on a paste — it hands over the button instead', async () => {
    const user = userEvent.setup()
    const reauth = vi.spyOn(authClient, 'reauthenticate').mockResolvedValue(MODAL_CHALLENGE)
    const verify = vi
      .spyOn(authClient, 'verifyCode')
      .mockRejectedValue(new Error('D-OTP-4: a paste must not submit'))
    renderModal()
    const field = await reachCodeBody(user)

    field.focus()
    await user.paste('123 456')
    expect(field).toHaveValue('123456')
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: en('auth.otp.submit') }),
      ),
    )
    /* D-OTP-4 travels with the field, into whatever container mounts it. */
    expect(verify).not.toHaveBeenCalled()
    reauth.mockRestore()
    verify.mockRestore()
  })

  it('returns to the CODE body after cancelling a sign-out, not to the password body', async () => {
    const user = userEvent.setup()
    const reauth = vi.spyOn(authClient, 'reauthenticate').mockResolvedValue(MODAL_CHALLENGE)
    renderModal()
    await reachCodeBody(user)

    await user.click(screen.getByRole('button', { name: en('auth.signOut') }))
    expect(screen.getByText(en('auth.reauth.signOutConfirm.title'))).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: en('common.cancel') }))

    /* Cancelling returns them where they were. Dropping back to the password
       body would ask them to re-authenticate a step they have already passed. */
    expect(await screen.findByLabelText(en('auth.otp.label'))).toBeInTheDocument()
    expect(screen.queryByLabelText(en('auth.field.password'))).toBeNull()
    reauth.mockRestore()
  })

  it('takes the password-only arm on a trusted device — the code step never renders', async () => {
    const user = userEvent.setup()
    const { props } = renderModal()
    /* No stub: the seeded current device for the signed-in operator is trusted
       for 30 days, so the real client takes the other arm. */
    await user.type(await screen.findByLabelText(en('auth.field.password')), 'eyvar-ops-2026')
    await user.click(screen.getByRole('button', { name: en('auth.reauth.submit') }))

    await waitFor(() => expect(props.onResumed).toHaveBeenCalled())
    expect(screen.queryByLabelText(en('auth.otp.label'))).toBeNull()
  })
})

/* ══════════════ AC-568 — sign out while dirty, session ALIVE ═════════ */

describe('AC-568 — explicit sign out while dirty names what will be lost', () => {
  function renderSignOut(overrides: Partial<React.ComponentProps<typeof SignOutDirtyDialog>> = {}) {
    const props: React.ComponentProps<typeof SignOutDirtyDialog> = {
      open: true,
      entity: 'payout adjustment',
      t,
      onCancel: vi.fn(),
      onConfirm: vi.fn(),
      ...overrides,
    }
    return { props, ...render(<SignOutDirtyDialog {...props} />) }
  }

  it('names the entity, and says what will NOT change', async () => {
    renderSignOut()
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText(en('state.leaveDirty.title'))).toBeInTheDocument()
    /* `{entity}` is the SaveBar's own noun, so the bar and the dialog name the
       same object (`copy.md` rule 5). The body's second clause is `copy.md`
       rule 9 — what does not change. */
    const body = en('state.leaveDirty.body').replace('{entity}', 'payout adjustment')
    expect(screen.getByText(body)).toBeInTheDocument()
    expect(body).toContain('Anything you saved earlier is unaffected')
  })

  it('reworded the primary, and only the primary', async () => {
    renderSignOut()
    /* §8.4 — the shell's `navigate-away-dirty` modal **unchanged**, with
       `Discard changes` reworded to `Discard and sign out`: the operator is
       doing both, and a primary naming half of it is one they press expecting
       to stay. */
    expect(
      await screen.findByRole('button', { name: en('session.signOutDirty.confirm') }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: en('state.leaveDirty.confirm') })).toBeNull()
    expect(screen.getByRole('button', { name: en('state.leaveDirty.cancel') })).toBeInTheDocument()
  })

  it('cancels without signing out — only the operator discards their own work', async () => {
    const user = userEvent.setup()
    const { props } = renderSignOut()
    await user.click(await screen.findByRole('button', { name: en('state.leaveDirty.cancel') }))
    expect(props.onCancel).toHaveBeenCalled()
    expect(props.onConfirm).not.toHaveBeenCalled()
  })

  it('is dismissible on Escape, unlike the re-auth modal', async () => {
    const user = userEvent.setup()
    const { props } = renderSignOut()
    await screen.findByRole('alertdialog')
    await user.keyboard('{Escape}')
    /* The session is **alive** and nothing is frozen, so dismissing is simply
       cancelling and the safe outcome. The re-auth modal refuses Escape for the
       opposite reason: there is nothing behind it to reach. */
    expect(props.onCancel).toHaveBeenCalled()
    expect(props.onConfirm).not.toHaveBeenCalled()
  })

  it('has a blue primary, not a red one', async () => {
    renderSignOut()
    const confirm = await screen.findByRole('button', {
      name: en('session.signOutDirty.confirm'),
    })
    /* R5a — §5.3 restricts red, it does not mandate it. Signing out is
       recoverable; the work is what is lost, and the body says so. */
    expect(confirm).toHaveAttribute('data-variant', 'default')
    /* Checked on the VARIANT, not on the class string: every button carries
       `aria-invalid:border-destructive` in its base recipe, so a substring
       search for `destructive` matches all of them and proves nothing. The
       variant is the decision; the class list is its output. */
    expect(confirm).not.toHaveAttribute('data-variant', 'destructive')
    expect(confirm.className).toContain('bg-primary')
  })
})

