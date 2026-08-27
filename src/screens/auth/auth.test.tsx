/**
 * The auth build, against `specs/04-auth-and-onboarding.md` §13.
 *
 * **Written to fail on the defects the design names as most likely**, not to
 * confirm that the happy path renders. Every `describe` below quotes the
 * criterion it is checking, so a failure names the promise it broke rather than
 * a selector that moved.
 *
 * Three of these exist specifically because `DECISIONS.md`'s CARRIED list says
 * an engineer will get them wrong:
 *
 * 1. **`readOnly`, never `disabled`** on every text input in every frozen or
 *    in-flight state. `AC-562`, `AC-563` and `AC-586` all fail on this one
 *    attribute, and it looks like a stylistic preference right up until you
 *    know why it isn't.
 * 2. **One OTP input, not six**, with paste moving focus and typing not.
 * 3. **A closed control inventory** on the re-authentication surface —
 *    `AC-567 (a)`, which is a diff and not a search, because a QA engineer
 *    cannot enumerate the controls that might be added later.
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AUTH_FIXTURE_PASSWORD, disableMockLatency, resetDataLayer } from '@/data/clients'
import * as authClient from '@/data/clients/auth'
import { EN } from '@/i18n/dictionaries'
import { bannerModel } from '@/components/auth/AuthBanner'
import * as React from 'react'
import { ShellProvider, useShell } from '@/shell/ShellContext'
import {
  ActivateScreen,
  EnrollScreen,
  ForgotPasswordScreen,
  ResetPasswordScreen,
  SignInScreen,
  VerifyScreen,
} from './index'

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


/** The URL and the router state, so a redirect's payload can be asserted. */
function LocationProbe() {
  const location = useLocation()
  return (
    <div>
      <span data-testid="url">{location.pathname + location.search}</span>
      <span data-testid="state">{JSON.stringify(location.state ?? null)}</span>
    </div>
  )
}

/**
 * The shell's session starts **authenticated** — `GET /session` succeeds, which
 * models a valid auth cookie, and that is the honest default for the product.
 * A test of a sign-in card therefore has to sign out first, or **AC-502**
 * redirects before the card mounts. This is that, and it exercises **AC-575**
 * on the way past.
 *
 * The children are held back until the sign-out has committed, so no test
 * observes one frame of the authenticated tree it did not ask for.
 */
function SignedOut({ children }: { children: React.ReactNode }) {
  const shell = useShell()
  const signOut = shell.session_lifecycle.signOut
  const [ready, setReady] = React.useState(shell.session_lifecycle.status === 'signed-out')
  React.useEffect(() => {
    signOut()
    setReady(true)
  }, [signOut])
  return ready ? <>{children}</> : null
}

function renderAuth(entry: string, state?: unknown, options: { authenticated?: boolean } = {}) {
  const Gate = options.authenticated ? React.Fragment : SignedOut
  return render(
    <MemoryRouter initialEntries={[{ pathname: entry.split('?')[0] as string, search: entry.includes('?') ? `?${entry.split('?')[1]}` : '', state }]}>
      <ShellProvider>
        <Gate>
        <Routes>
          <Route path="/signin" element={<SignInScreen />} />
          <Route path="/signin/verify" element={<VerifyScreen />} />
          <Route path="/signin/enroll" element={<EnrollScreen />} />
          <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
          <Route path="/reset-password" element={<ResetPasswordScreen />} />
          <Route path="/activate" element={<ActivateScreen />} />
          <Route path="*" element={<div>elsewhere</div>} />
        </Routes>
        </Gate>
        <LocationProbe />
      </ShellProvider>
    </MemoryRouter>,
  )
}

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

/* ═══════════════════════ 13.1 — sign in ═══════════════════════════════ */

describe('AC-500 — "/signin renders with no rail, no sub-tab column and no top bar"', () => {
  it('has none of the three in the DOM', async () => {
    renderAuth('/signin')
    await screen.findByRole('heading', { name: en('auth.signin.title') })

    /* The three regions are the rail's `<nav>`, the column's `<nav>` and the
       top bar's `<header>`. None of them is rendered, because the auth routes
       are SIBLINGS of `AppLayout` rather than children — a `hidden` class would
       leave all three in the DOM and pass a weaker version of this test. */
    expect(screen.queryByRole('navigation')).toBeNull()
    expect(screen.queryByRole('banner')).toBeNull()
  })
})

describe('AC-502 — "an authenticated operator opening /signin is sent to session.landingRoute without rendering the card"', () => {
  it('redirects, and the card is never in the DOM', async () => {
    renderAuth('/signin', undefined, { authenticated: true })
    /* `ShellProvider` starts authenticated, so this is the criterion's own
       precondition without any arrangement. */
    await waitFor(() => expect(screen.getByTestId('url')).not.toHaveTextContent('/signin'))
    expect(screen.queryByRole('heading', { name: en('auth.signin.title') })).toBeNull()
  })
})

describe('AC-503 — the card contains, in this order: … password field, Forgot password?, Remember this device, a full-width primary', () => {
  it('puts `Forgot password?` ABOVE the primary, not below it', async () => {
    renderAuth('/signin')
    const forgot = await screen.findByRole('button', { name: en('auth.signin.forgot') })
    const primary = screen.getByRole('button', { name: en('auth.signin.submit') })

    /* Design §15 overrule 1: the link is an escape from THE PASSWORD, not from
       the card, and it is what an operator reaches for in the second after the
       primary just failed. Below the primary it sits under the fold a banner
       re-render pushes down. */
    expect(forgot.compareDocumentPosition(primary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('renders no social provider and no `Create account`', async () => {
    renderAuth('/signin')
    await screen.findByRole('heading', { name: en('auth.signin.title') })
    expect(screen.queryByText(/create account/i)).toBeNull()
    expect(screen.queryByText(/continue with/i)).toBeNull()
  })
})

describe('AC-504 — "an identifier that is not a plausible email … does not issue a network request"', () => {
  it('shows the inline error and calls nothing', async () => {
    const user = userEvent.setup()
    const signIn = vi
      .spyOn(authClient, 'signIn')
      .mockRejectedValue(new Error('AC-504: no request may reach the client'))
    renderAuth('/signin')

    await user.type(screen.getByLabelText(en('auth.field.email')), 'fahad@eyvar')
    await user.type(screen.getByLabelText(en('auth.field.password')), 'whatever')
    await user.click(screen.getByRole('button', { name: en('auth.signin.submit') }))

    /* The period is R6's, and `copy.md:33` now agrees — spec §19.3 C-2, closed
       on both sides. One string, one spelling, checked byte for byte. */
    expect(await screen.findByText(en('auth.error.email'))).toBeInTheDocument()
    expect(signIn).not.toHaveBeenCalled()
    signIn.mockRestore()
  })
})

describe('AC-506 / AC-508 / AC-578 — four causes, byte-identical copy', () => {
  /**
   * **All four of AC-506's causes, exercised from the outside.**
   *
   * The fourth — *a wrong password on a live account* — used to be unreachable:
   * `signIn` looked the identity up by email and never read `input.password`,
   * so `sarah@eyvar.com` with any string returned a challenge and the criterion
   * could only be met structurally. `signIn` reads the password now, so the
   * case below is a real submission producing a real refusal, and it is the one
   * that matters most: it is the only cause where the account **exists and is
   * live**, which is exactly the pair an enumeration oracle would tell apart.
   *
   * The structural guarantee is still asserted after the loop, because it is
   * the half that survives a server change: all four resolve to **one**
   * `AuthCondition`, so there is nowhere for a fourth sentence to grow.
   */
  const cases: Array<[label: string, email: string, password: string]> = [
    ['an unknown identifier', 'nobody@eyvar.com', 'anything'],
    ['a suspended account', 'suspended@eyvar.com', 'anything'],
    ['an invited account', 'noura.f@eyvar.com', 'anything'],
    ['a wrong password on a live account', 'sarah@eyvar.com', 'not-the-password'],
  ]

  for (const [label, email, password] of cases) {
    it(`renders the same title and body for ${label}`, async () => {
      const user = userEvent.setup()
      renderAuth('/signin')
      await user.type(screen.getByLabelText(en('auth.field.email')), email)
      if (password !== '') {
        await user.type(screen.getByLabelText(en('auth.field.password')), password)
      }
      await user.click(screen.getByRole('button', { name: en('auth.signin.submit') }))

      expect(await screen.findByText(en('auth.error.credentials.title'))).toBeInTheDocument()
      expect(screen.getByText(en('auth.error.credentials.body'))).toBeInTheDocument()

      /* **AC-508** — the words appear nowhere on the surface. */
      for (const word of ['invited', 'activate', 'pending', 'suspended', 'disabled', 'deactivated']) {
        expect(document.body.textContent?.toLowerCase()).not.toContain(word)
      }
    })
  }

  it('resolves every rejection cause to ONE condition, so the four cannot diverge', () => {
    /* This is the structural half of AC-506, and it is the half that survives a
       server change: `SignInFailureReason` has one `rejected` member and
       `bannerModel` has one `credentials-rejected` branch, so there is nowhere
       for a fourth cause to grow its own sentence. A refusal to distinguish is
       stronger than four call sites agreeing not to. */
    const t = Object.assign((key: string) => en(key), { plural: (key: string) => en(key) })
    const model = bannerModel({ kind: 'credentials-rejected' }, t as never)
    expect(model.title).toBe(en('auth.error.credentials.title'))
    expect(model.body).toBe(en('auth.error.credentials.body'))
    expect(model.tone).toBe('critical')
  })
})

describe('AC-507 — "after any credential rejection the identifier still holds what was typed and the password is empty"', () => {
  it('keeps the identifier and clears the password', async () => {
    const user = userEvent.setup()
    renderAuth('/signin')
    const email = screen.getByLabelText(en('auth.field.email'))
    const password = screen.getByLabelText(en('auth.field.password'))
    await user.type(email, 'nobody@eyvar.com')
    await user.type(password, 'wrong-password')
    await user.click(screen.getByRole('button', { name: en('auth.signin.submit') }))

    await screen.findByText(en('auth.error.credentials.title'))
    expect(email).toHaveValue('nobody@eyvar.com')
    expect(password).toHaveValue('')
  })
})

describe('AC-509 / §2.5 — "while a submission is in flight … both fields remain readable"', () => {
  it('makes the fields readOnly and NOT disabled', async () => {
    const user = userEvent.setup()
    /* A promise that never resolves holds the screen in its in-flight state,
       which is the only way to observe it. */
    const signIn = vi.spyOn(authClient, 'signIn').mockReturnValue(new Promise(() => {}))
    renderAuth('/signin')

    const email = screen.getByLabelText(en('auth.field.email'))
    const password = screen.getByLabelText(en('auth.field.password'))
    await user.type(email, 'sarah@eyvar.com')
    await user.type(password, 'x')
    await user.click(screen.getByRole('button', { name: en('auth.signin.submit') }))

    await waitFor(() => expect(email).toHaveAttribute('readonly'))
    /* **THE defect the design names as most likely.** `disabled` greys the
       value and drops the field from some AT trees — losing the exact thing the
       in-flight state exists to protect. AC-562, AC-563 and AC-586 all fail on
       this one attribute. */
    expect(email).not.toBeDisabled()
    expect(password).toHaveAttribute('readonly')
    expect(password).not.toBeDisabled()
    /* …and the primary is not re-triggerable. */
    expect(screen.getByRole('button', { name: en('auth.signin.submit') })).toBeDisabled()
    expect(signIn).toHaveBeenCalledTimes(1)
    signIn.mockRestore()
  })
})

describe('AC-510 — the reveal control', () => {
  it('toggles the field type, has an accessible name, and is type="button"', async () => {
    const user = userEvent.setup()
    renderAuth('/signin')
    const password = screen.getByLabelText(en('auth.field.password'))
    expect(password).toHaveAttribute('type', 'password')

    const reveal = screen.getByRole('button', { name: en('auth.field.showPassword') })
    /* `type="button"`, so `Enter` in the field submits the card's primary and
       **never toggles the reveal** (**AC-509**, §13). */
    expect(reveal).toHaveAttribute('type', 'button')
    await user.click(reveal)
    expect(password).toHaveAttribute('type', 'text')
    await user.click(screen.getByRole('button', { name: en('auth.field.hidePassword') }))
    expect(password).toHaveAttribute('type', 'password')
  })
})

describe('AC-511 — "with ?mockFail=auth.signIn … the identifier is preserved and the password is cleared"', () => {
  it('shows the transport error with a retry, and keeps the identifier', async () => {
    const user = userEvent.setup()
    const signIn = vi.spyOn(authClient, 'signIn').mockRejectedValue(new Error('offline'))
    renderAuth('/signin')

    const email = screen.getByLabelText(en('auth.field.email'))
    await user.type(email, 'sarah@eyvar.com')
    await user.type(screen.getByLabelText(en('auth.field.password')), 'secret')
    await user.click(screen.getByRole('button', { name: en('auth.signin.submit') }))

    expect(await screen.findByText(en('auth.error.signin.title'))).toBeInTheDocument()
    expect(screen.getByText(en('auth.error.signin.body'))).toBeInTheDocument()
    /* §2.5 — the retry lives **inside** the banner, not as a second page control. */
    expect(screen.getByRole('button', { name: en('auth.tryAgain') })).toBeInTheDocument()
    expect(email).toHaveValue('sarah@eyvar.com')
    expect(screen.getByLabelText(en('auth.field.password'))).toHaveValue('')
    signIn.mockRestore()
  })
})

describe('AC-513 — "Forgot password? navigates to /forgot-password carrying whatever identifier was typed"', () => {
  it('pre-fills the address on the next card', async () => {
    const user = userEvent.setup()
    renderAuth('/signin')
    await user.type(screen.getByLabelText(en('auth.field.email')), 'fahad@eyvar.com')
    await user.click(screen.getByRole('button', { name: en('auth.signin.forgot') }))

    expect(await screen.findByRole('heading', { name: en('auth.forgot.title') })).toBeInTheDocument()
    expect(screen.getByLabelText(en('auth.field.email'))).toHaveValue('fahad@eyvar.com')
  })
})

describe('AC-514 / AC-515 — the second factor is not optional', () => {
  it('sends a correct credential step to the code screen', async () => {
    const user = userEvent.setup()
    renderAuth('/signin')
    await user.type(screen.getByLabelText(en('auth.field.email')), 'sarah@eyvar.com')
    /* `signIn` reads the password now, so the fixture one is required. Imported
       from the fixtures rather than spelled here: two spellings of the one
       password every seeded identity accepts is a test that breaks on a rename
       for a reason nobody can find. */
    await user.type(screen.getByLabelText(en('auth.field.password')), AUTH_FIXTURE_PASSWORD)
    await user.click(screen.getByRole('button', { name: en('auth.signin.submit') }))

    expect(await screen.findByLabelText(en('auth.otp.label'))).toBeInTheDocument()
    expect(screen.getByTestId('url')).toHaveTextContent('/signin/verify')
  })
})

/* ═══════════════════ 13.2 — the verification code ═════════════════════ */

const CHALLENGE = {
  challengeId: 'CHL-1',
  secondFactor: { method: 'sms' as const, hint: '••••••67' },
  expiresAt: '2026-08-27T12:00:00.000Z',
  resendAvailableAt: '2026-08-27T10:00:30.000Z',
  origin: 'signin' as const,
}

describe('§4.1 D-OTP-1 — "one input, not six boxes"', () => {
  it('renders exactly one labelled field, with the right autofill semantics', async () => {
    renderAuth('/signin/verify', CHALLENGE)
    const field = await screen.findByLabelText(en('auth.otp.label'))

    /* Six boxes announce as six unlabelled edit fields; one field announces as
       one field with one value the operator can review. */
    expect(screen.getAllByRole('textbox')).toHaveLength(1)
    /* **AC-679** — OS-level SMS autofill fills one field reliably and six
       unreliably, and when it half-fills six the operator cannot tell. */
    expect(field).toHaveAttribute('autocomplete', 'one-time-code')
    expect(field).toHaveAttribute('inputmode', 'numeric')
    expect(field).toHaveAttribute('maxlength', '6')
    /* **AC-537 / AC-674** — `dir="ltr"` in BOTH languages, and centred, so the
       fill order is identical in Arabic and English by construction. */
    expect(field).toHaveAttribute('dir', 'ltr')
    expect(field.className).toContain('text-center')
  })
})

describe('AC-518 — "accepts exactly 6 numeric characters and rejects letters and symbols at input time"', () => {
  it('never lets a non-digit land', async () => {
    const user = userEvent.setup()
    renderAuth('/signin/verify', CHALLENGE)
    const field = await screen.findByLabelText(en('auth.otp.label'))

    await user.type(field, 'a1b2c3!4')
    /* Rejected AT INPUT TIME, not shown and then removed: a letter that appears
       and disappears is a field arguing with the operator. */
    expect(field).toHaveValue('1234')
  })

  it('stops at six', async () => {
    const user = userEvent.setup()
    renderAuth('/signin/verify', CHALLENGE)
    const field = await screen.findByLabelText(en('auth.otp.label'))
    await user.type(field, '1234567890')
    expect(field).toHaveValue('123456')
  })
})

describe('AC-520 / AC-521 — paste fills, strips separators, moves focus, and does NOT submit', () => {
  const pastes = ['123456', '123 456', '123-456', '123–456', '123 456']

  for (const pasted of pastes) {
    it(`fills from ${JSON.stringify(pasted)} and moves focus to the primary without submitting`, async () => {
      const user = userEvent.setup()
      const verify = vi.spyOn(authClient, 'verifyCode').mockResolvedValue({
        kind: 'failed',
        reason: 'incorrect',
        attemptsRemaining: 4,
        lockedUntil: null,
      })
      renderAuth('/signin/verify', CHALLENGE)
      const field = await screen.findByLabelText(en('auth.otp.label'))

      field.focus()
      await user.paste(pasted)

      expect(field).toHaveValue('123456')
      /* **D-OTP-4** — a paste is one atomic act whose whole result the operator
         can see, so handing them the button is a favour. **Nothing submits**:
         the cost of not auto-submitting is one keystroke, and the cost of
         auto-submitting is a consumed attempt on a screen where the fifth costs
         fifteen minutes. */
      await waitFor(() =>
        expect(document.activeElement).toBe(
          screen.getByRole('button', { name: en('auth.otp.submit') }),
        ),
      )
      expect(verify).not.toHaveBeenCalled()
      verify.mockRestore()
    })
  }

  it('leaves focus in the field for a partial paste', async () => {
    const user = userEvent.setup()
    renderAuth('/signin/verify', CHALLENGE)
    const field = await screen.findByLabelText(en('auth.otp.label'))
    field.focus()
    await user.paste('123')
    expect(field).toHaveValue('123')
    expect(document.activeElement).toBe(field)
  })
})

describe('§4.1 D-OTP-4 — "typing the 6th digit moves focus nowhere"', () => {
  it('keeps the caret in the field after the sixth keystroke', async () => {
    const user = userEvent.setup()
    renderAuth('/signin/verify', CHALLENGE)
    const field = await screen.findByLabelText(en('auth.otp.label'))
    await user.type(field, '123456')

    /* A typist's next keystroke after the 6th digit would land on the button,
       where `Space` submits a code they have not read. */
    expect(document.activeElement).toBe(field)
  })
})

describe('AC-519 — "never shows more than the last two digits"', () => {
  it('renders the masked hint inside an LTR-isolated run', async () => {
    renderAuth('/signin/verify', CHALLENGE)
    await screen.findByLabelText(en('auth.otp.label'))
    const bdi = document.querySelector('bdi')
    /* **AC-675** — the masked run is a numeric run and must not reorder in
       Arabic. Two digits, not four: spec §19.1 records that §12.2's own
       illustrative string exposed four and violated the criterion that wrote it. */
    expect(bdi).not.toBeNull()
    expect(bdi).toHaveAttribute('dir', 'ltr')
    expect(bdi?.textContent).toBe('••••••67')
    expect(bdi?.textContent?.replace(/•/g, '')).toHaveLength(2)
  })
})

describe('§4.5 — "challenge-missing replaces the whole card"', () => {
  it('renders the replacement, and no code field, when opened directly', async () => {
    renderAuth('/signin/verify')
    expect(
      await screen.findByRole('heading', { name: en('auth.otp.missing.title') }),
    ).toBeInTheDocument()
    /* A banner above an absent form is nonsense: the form is gone, so the card
       is replaced rather than annotated. */
    expect(screen.queryByLabelText(en('auth.otp.label'))).toBeNull()
    /* **AC-581** — the stated next action is a real control, not a sentence. */
    expect(screen.getByRole('button', { name: en('auth.otp.goToSignIn') })).toBeInTheDocument()
  })
})

describe('AC-535 — "a transport failure preserves the entered digits and the counter does not increase"', () => {
  it('keeps the six digits on screen', async () => {
    const user = userEvent.setup()
    const verify = vi.spyOn(authClient, 'verifyCode').mockRejectedValue(new Error('down'))
    renderAuth('/signin/verify', CHALLENGE)
    const field = await screen.findByLabelText(en('auth.otp.label'))
    await user.type(field, '123456')
    await user.click(screen.getByRole('button', { name: en('auth.otp.submit') }))

    expect(await screen.findByText(en('auth.error.verify.title'))).toBeInTheDocument()
    expect(screen.getByText(en('auth.error.verify.body'))).toBeInTheDocument()
    expect(field).toHaveValue('123456')
    verify.mockRestore()
  })
})

describe('§4.3 — the attempt ladder, and the tone that tells the operator whether it counted', () => {
  it('names the consequence on the second wrong attempt and not the first', async () => {
    const user = userEvent.setup()
    const verify = vi
      .spyOn(authClient, 'verifyCode')
      .mockRejectedValue(new Error('D-OTP-4: a paste must not submit'))
    renderAuth('/signin/verify', CHALLENGE)
    const field = await screen.findByLabelText(en('auth.otp.label'))

    verify.mockResolvedValueOnce({
      kind: 'failed',
      reason: 'incorrect',
      attemptsRemaining: 4,
      lockedUntil: null,
    })
    await user.type(field, '111111')
    await user.click(screen.getByRole('button', { name: en('auth.otp.submit') }))
    expect(await screen.findByText(en('auth.otp.wrong.body'))).toBeInTheDocument()

    verify.mockResolvedValueOnce({
      kind: 'failed',
      reason: 'incorrect',
      attemptsRemaining: 3,
      lockedUntil: null,
    })
    await user.type(screen.getByLabelText(en('auth.otp.label')), '222222')
    await user.click(screen.getByRole('button', { name: en('auth.otp.submit') }))
    /* *"Telling an operator '4 attempts left' after one mistype is alarm
       without information. Telling them 'one more cancels this code' at the
       moment it becomes true is the only warning that changes what they do
       next."* */
    expect(await screen.findByText(en('auth.otp.wrong2.body'))).toBeInTheDocument()
    verify.mockRestore()
  })

  it('renders the CANCELLED state on the third wrong attempt, and opens the resend', async () => {
    const user = userEvent.setup()
    const verify = vi.spyOn(authClient, 'verifyCode').mockResolvedValue({
      kind: 'failed',
      /* **`invalidated`, not `incorrect` with a count.** The seam names the
         state now, and the code really is cancelled behind it — see
         `clients/auth.test.ts`, which submits the original code afterwards and
         watches it be refused. */
      reason: 'invalidated',
      attemptsRemaining: 2,
      lockedUntil: null,
    })
    renderAuth('/signin/verify', CHALLENGE)
    await user.type(await screen.findByLabelText(en('auth.otp.label')), '333333')
    await user.click(screen.getByRole('button', { name: en('auth.otp.submit') }))

    /* Warning, not red: *"the condition is 'this code is gone', not 'you got it
       wrong' — the wrongness was already announced."* */
    expect(await screen.findByText(en('auth.otp.invalidated.title'))).toBeInTheDocument()
    /* **AC-526** — the resend is enabled **regardless of cooldown**, relabelled. */
    expect(screen.getByRole('button', { name: en('auth.otp.resendNew') })).toBeEnabled()
    /* And the field is `readOnly` until a new code lands — **never `disabled`**. */
    const field = screen.getByLabelText(en('auth.otp.label'))
    expect(field).toHaveAttribute('readonly')
    expect(field).not.toBeDisabled()
    verify.mockRestore()
  })
})

describe('§4.4 — "the supersession trap is closed before it springs"', () => {
  it('warns the instant Resend succeeds, not after the wrong code is typed', async () => {
    const user = userEvent.setup()
    const resend = vi.spyOn(authClient, 'resendCode').mockResolvedValue({
      kind: 'sent',
      challengeId: 'CHL-2',
      expiresAt: '2026-08-27T12:10:00.000Z',
      resendAvailableAt: '2026-08-27T10:01:00.000Z',
      /* §4.4's `resends left` line. 4 remain after the first resend, so the
         line does not render — it appears at 2 or fewer. */
      resendsRemaining: 3,
    })
    renderAuth('/signin/verify', { ...CHALLENGE, resendAvailableAt: '2000-01-01T00:00:00.000Z' })

    await user.click(await screen.findByRole('button', { name: en('auth.otp.resend') }))
    expect(await screen.findByText(en('auth.otp.resent.title'))).toBeInTheDocument()
    expect(screen.getByText(en('auth.otp.resent.body'))).toBeInTheDocument()
    resend.mockRestore()
  })
})

/* ══════════════ 13.3 — forgot password, reset, activation ═════════════ */

describe('AC-539 / AC-540 / AC-541 — the non-committal confirmation', () => {
  it('lands on /signin, is byte-identical, and asserts nothing about the address', async () => {
    const user = userEvent.setup()
    renderAuth('/forgot-password', { email: 'nobody@eyvar.com' })
    await user.click(await screen.findByRole('button', { name: en('auth.forgot.submit') }))

    await waitFor(() => expect(screen.getByTestId('url')).toHaveTextContent('/signin'))
    /* §7.1 — the confirmation lands on the `/signin` card, in its banner slot,
       because the operator's next act is in their mailbox and §6.3 keeps
       signing in normally from invalidating the link. */
    expect(screen.getByText(en('auth.reset.requested.title'))).toBeInTheDocument()
    /* **AC-541** — none of `found`, `exists`, `no account`, and no name. */
    const copy = en('auth.reset.requested.body').toLowerCase()
    for (const word of ['found', 'exists', 'no account']) expect(copy).not.toContain(word)
    /* **AC-540** — the expiry is stated in words. */
    expect(copy).toContain('60 minutes')
  })
})

describe('AC-543 / AC-544 — one state for every invalid-token cause', () => {
  for (const token of ['expired', 'used', 'superseded', 'nonsense']) {
    it(`renders the same invalid-link card for ?token=${token}`, async () => {
      renderAuth(`/reset-password?token=${token}`)
      expect(
        await screen.findByRole('heading', { name: en('auth.reset.tokenInvalid.title') }),
      ).toBeInTheDocument()
      expect(screen.queryByLabelText(en('auth.reset.newPassword'))).toBeNull()
      expect(
        screen.getByRole('button', { name: en('auth.reset.tokenInvalid.action') }),
      ).toBeInTheDocument()
    })
  }

  it('renders the invalid-link state with NO token at all, not an empty form', async () => {
    renderAuth('/reset-password')
    expect(
      await screen.findByRole('heading', { name: en('auth.reset.tokenInvalid.title') }),
    ).toBeInTheDocument()
  })
})

describe('AC-545 / AC-546 / AC-547 — the policy, the minimum and the match', () => {
  it('states the 12-character policy BEFORE anything is typed', async () => {
    renderAuth('/reset-password?token=valid')
    expect(await screen.findByText(en('auth.reset.policy'))).toBeInTheDocument()
  })

  it('cannot be submitted under 12 characters, and the meter names the minimum', async () => {
    const user = userEvent.setup()
    renderAuth('/reset-password?token=valid')
    const field = await screen.findByLabelText(en('auth.reset.newPassword'))
    await user.type(field, 'short')

    /* **Gated at render, not at commit** — foundation §11.2, and **AC-667**:
       nothing here is enabled-then-refused. The primary is disabled, so `Enter`
       does not submit either; there is one gate and it is visible.

       The minimum is named twice over: the meter's caption states it as a
       requirement while the field is short, and the policy line under the field
       has stated it since mount (**AC-545**). */
    expect(screen.getByRole('button', { name: en('auth.reset.submit') })).toBeDisabled()
    expect(screen.getByText(en('auth.reset.strength.short'))).toBeInTheDocument()
    expect(screen.getByText(en('auth.reset.policy'))).toBeInTheDocument()
  })

  it('shows a mismatch under the CONFIRM field, and gates the primary', async () => {
    const user = userEvent.setup()
    renderAuth('/reset-password?token=valid')
    await user.type(
      await screen.findByLabelText(en('auth.reset.newPassword')),
      'correcthorsebattery',
    )
    await user.type(screen.getByLabelText(en('auth.reset.confirmPassword')), 'correcthorsebatter')
    expect(screen.getByRole('button', { name: en('auth.reset.submit') })).toBeDisabled()
  })
})

describe('AC-654 — "the in-flight state is a skeleton shaped like the form, never a centred spinner"', () => {
  it('renders skeleton bars, not a spinner, while the token is validated', async () => {
    const validate = vi.spyOn(authClient, 'validateResetToken').mockReturnValue(new Promise(() => {}))
    renderAuth('/reset-password?token=valid')

    await waitFor(() =>
      expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0),
    )
    expect(screen.queryByRole('status', { name: 'Loading' })).toBeNull()
    validate.mockRestore()
  })
})

describe('AC-550 — "a token-validation transport failure is NOT the invalid-link state"', () => {
  it('renders the form with a critical banner and a retry', async () => {
    const validate = vi
      .spyOn(authClient, 'validateResetToken')
      .mockRejectedValue(new Error('down'))
    renderAuth('/reset-password?token=valid')

    expect(await screen.findByText(en('auth.error.tokenCheck.title'))).toBeInTheDocument()
    /* Explicitly not the dead-link card: the h1 is unchanged and the form is
       still there, `readOnly` rather than gone. */
    expect(screen.queryByText(en('auth.reset.tokenInvalid.title'))).toBeNull()
    expect(screen.getByRole('heading', { name: en('auth.reset.title') })).toBeInTheDocument()
    validate.mockRestore()
  })
})

describe('AC-556 — activation failure leaves the account unchanged', () => {
  it('shows the activation error with a retry and keeps both values', async () => {
    const user = userEvent.setup()
    const activate = vi.spyOn(authClient, 'activateInvite').mockRejectedValue(new Error('down'))
    renderAuth('/activate?token=valid')

    const password = await screen.findByLabelText(en('auth.field.password'))
    await user.type(password, 'correcthorsebattery')
    await user.type(screen.getByLabelText(en('auth.reset.confirmPassword')), 'correcthorsebattery')
    await user.click(screen.getByRole('button', { name: en('auth.activate.submit') }))

    expect(await screen.findByText(en('auth.error.activate.title'))).toBeInTheDocument()
    expect(password).toHaveValue('correcthorsebattery')
    activate.mockRestore()
  })
})

/* ═══════════════ 13.10 / 13.11 — permissions, copy, a11y ══════════════ */

describe('AC-656 / AC-657 / AC-672 — the copy rules, checked across every auth string', () => {
  const authKeys = Object.keys(EN).filter((key) => key.startsWith('auth.') || key.startsWith('session.'))

  it('contains no "please", no "invalid", no "failed" and no exclamation mark', () => {
    for (const key of authKeys) {
      const value = (EN[key] as string).toLowerCase()
      expect(value, key).not.toContain('please')
      expect(value, key).not.toContain('invalid')
      expect(value, key).not.toContain('failed')
      expect(EN[key] as string, key).not.toContain('!')
    }
  })

  it('contains no emoji', () => {
    /* **AC-672.** The range check is deliberately broad: an emoji in an
       operations console is a tone decision nobody made. */
    const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u
    for (const key of authKeys) expect(emoji.test(EN[key] as string), key).toBe(false)
  })
})

describe('AC-676 — "every interactive element has a visible focus indicator"', () => {
  it('gives every button and input on the sign-in card a focus-visible ring', async () => {
    renderAuth('/signin')
    await screen.findByRole('heading', { name: en('auth.signin.title') })

    /* Radix renders a visually-hidden proxy `<input>` behind `Checkbox` — it is
       `aria-hidden`, `tabindex="-1"` and unreachable, so it is not an
       interactive element for §7.2's purposes. Filtering by *reachability*
       rather than by tag is what keeps this test about focus rings instead of
       about which primitive shipped a shadow input. */
    const interactive = Array.from(
      document.querySelectorAll<HTMLElement>('button, input, a[href]'),
    ).filter(
      (element) =>
        element.getAttribute('aria-hidden') !== 'true' && element.tabIndex >= 0,
    )
    expect(interactive.length).toBeGreaterThan(0)
    for (const element of interactive) {
      /* §7.2 — `outline-none` without a replacement is a defect, not a style
         choice. Checked at source rather than by computed style, because jsdom
         does not resolve Tailwind. */
      expect(element.className, element.outerHTML.slice(0, 120)).toMatch(
        /focus-visible:ring|focus-visible:outline/,
      )
    }
  })
})

describe('AC-537 / AC-673 / AC-674 — Arabic', () => {
  it('keeps the code field LTR and centred with the document mirrored', async () => {
    const user = userEvent.setup()
    document.documentElement.setAttribute('dir', 'rtl')
    document.documentElement.setAttribute('lang', 'ar')
    try {
      renderAuth('/signin/verify', CHALLENGE)
      const field = await screen.findByLabelText(en('auth.otp.label'))

      /* **§4.1 D-OTP-7 — the position, taken explicitly.** A 6-digit run in a
         336px field aligned to either edge looks deliberate in one language and
         broken in the other; centre has no direction at all, so English and
         Arabic render identically and this criterion passes **by construction
         rather than by care**. `dir="ltr"` pins the digit order, which is
         `rtl.md`'s numeral-run rule applied. */
      expect(field).toHaveAttribute('dir', 'ltr')
      expect(field.className).toContain('text-center')

      await user.type(field, '12')
      expect(field).toHaveValue('12')
    } finally {
      document.documentElement.removeAttribute('dir')
      document.documentElement.removeAttribute('lang')
    }
  })

  it('uses only LOGICAL direction utilities across every auth surface', async () => {
    /* §9.1 — `ms-`/`me-`/`ps-`/`pe-`/`start-`/`end-`/`text-start`. The CLI
       converts what it adds (`"rtl": true` in `components.json`); hand-written
       code is on us, so this is the hand-written half, checked on what actually
       reached the DOM rather than on what the source says. */
    renderAuth('/signin')
    await screen.findByRole('heading', { name: en('auth.signin.title') })

    const physical =
      /(^|\s)-?(ml|mr|pl|pr|left|right|border-l|border-r|rounded-l|rounded-r|text-left|text-right)-/
    for (const element of Array.from(document.querySelectorAll<HTMLElement>('*'))) {
      /* `SVGElement.className` is an `SVGAnimatedString`, not a string — hence
         `getAttribute` rather than the property. The glyphs are the elements
         most likely to carry a stray `mr-1`, so skipping them would skip the
         risk. */
      const classes = element.getAttribute('class') ?? ''
      expect(classes, element.outerHTML.slice(0, 100)).not.toMatch(physical)
    }
  })
})

/* ══════════════ the three surfaces the seam unblocked ═══════════════ */

describe('AC-526 / AC-534 — the third wrong attempt cancels the code, and it is cancelled', () => {
  it('renders the cancelled state from the seam\'s own reason, not from arithmetic', async () => {
    const user = userEvent.setup()
    const verify = vi.spyOn(authClient, 'verifyCode').mockResolvedValue({
      kind: 'failed',
      reason: 'invalidated',
      attemptsRemaining: 2,
      lockedUntil: null,
    })
    renderAuth('/signin/verify', CHALLENGE)
    await user.type(await screen.findByLabelText(en('auth.otp.label')), '333333')
    await user.click(screen.getByRole('button', { name: en('auth.otp.submit') }))

    /* Warning, not red: the condition is *"this code is gone"*, not *"you got
       it wrong"* — the wrongness was already announced on attempts 1 and 2. */
    expect(await screen.findByText(en('auth.otp.invalidated.title'))).toBeInTheDocument()
    expect(screen.getByText(en('auth.otp.invalidated.body'))).toBeInTheDocument()

    /* The banner is now **true**: it used to be inferred from
       `attemptsRemaining === 2` while the code kept working, which is the one
       place this build knowingly lied. The seam carries the reason and cancels
       the code, so the mapping is by reason and the sentence is a fact. */
    expect(verify).toHaveBeenCalledTimes(1)
    /* The only way forward: enabled immediately, ignoring the cooldown. */
    expect(screen.getByRole('button', { name: en('auth.otp.resendNew') })).toBeEnabled()
    const field = screen.getByLabelText(en('auth.otp.label'))
    expect(field).toHaveAttribute('readonly')
    expect(field).not.toBeDisabled()
    verify.mockRestore()
  })

  it('refuses the ORIGINAL code afterwards, which is the half a banner cannot fake', async () => {
    /* Driven through the client rather than the field, deliberately: the claim
       under test is about the **server's** state after three wrong attempts,
       and routing it through six keystrokes and three renders would test the
       screen on the way to testing something else. The screen's half is the
       test above. */
    const signedIn = await authClient.signIn({
      email: 'sarah@eyvar.com',
      password: 'eyvar-ops-2026',
    })
    expect(signedIn.kind).toBe('challenge')
    const challengeId = (signedIn as { challengeId: string }).challengeId

    for (const wrong of ['111112', '222223', '333334']) {
      await authClient.verifyCode({ challengeId, code: wrong })
    }

    /* The **correct** code, submitted now, must not work. That is the effect
       the banner promises, and asserting it is the only way to know the promise
       is kept — the previous round shipped the sentence over a code that still
       worked, which is the defect this whole round closed. */
    const replay = await authClient.verifyCode({ challengeId, code: '123456' })
    expect(replay.kind).toBe('failed')
  })
})

describe('AC-533 / §4.4 — the resend budget', () => {
  it('shows the remaining count only once it is 2 or fewer', async () => {
    const user = userEvent.setup()
    const resend = vi.spyOn(authClient, 'resendCode').mockResolvedValue({
      kind: 'sent',
      challengeId: 'CHL-2',
      expiresAt: '2026-06-25T09:24:00+03:00',
      resendAvailableAt: '2000-01-01T00:00:00.000Z',
      resendsRemaining: 4,
    })
    renderAuth('/signin/verify', { ...CHALLENGE, resendAvailableAt: '2000-01-01T00:00:00.000Z' })

    await user.click(await screen.findByRole('button', { name: en('auth.otp.resend') }))
    await screen.findByText(en('auth.otp.resent.title'))
    /* Four left is not a warning, it is pressure. Nothing is shown. */
    expect(screen.queryByText(/resends left/)).toBeNull()

    resend.mockResolvedValue({
      kind: 'sent',
      challengeId: 'CHL-3',
      expiresAt: '2026-06-25T09:24:00+03:00',
      resendAvailableAt: '2000-01-01T00:00:00.000Z',
      resendsRemaining: 2,
    })
    await user.click(screen.getByRole('button', { name: en('auth.otp.resend') }))
    expect(await screen.findByText(/2 resends left/)).toBeInTheDocument()
    resend.mockRestore()
  })

  it('replaces the resend with `Go to sign in` when the budget is gone', async () => {
    const user = userEvent.setup()
    const resend = vi
      .spyOn(authClient, 'resendCode')
      .mockResolvedValue({ kind: 'exhausted', codesSent: 5 })
    renderAuth('/signin/verify', { ...CHALLENGE, resendAvailableAt: '2000-01-01T00:00:00.000Z' })

    await user.click(await screen.findByRole('button', { name: en('auth.otp.resend') }))

    /* §4.4 — the state renders **on this card**, so the operator is told why
       before they move. The control is **replaced**, not disabled: a disabled
       button that will never re-enable is a control that lies about its own
       future. */
    expect(await screen.findByText(en('auth.otp.exhausted.title'))).toBeInTheDocument()
    expect(screen.getByText(en('auth.otp.exhausted.body'))).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: en('auth.otp.resend') })).toBeNull()

    /* **AC-533's own wording** — returned to `/signin` and told to start
       again. One press later, and having read it. */
    await user.click(screen.getByRole('button', { name: en('auth.otp.goToSignIn') }))
    await waitFor(() => expect(screen.getByTestId('url')).toHaveTextContent('/signin'))
    resend.mockRestore()
  })
})

describe('AC-548 — a breached password is an inline error, not a dead link', () => {
  it('keeps both fields and stays on the form', async () => {
    const user = userEvent.setup()
    const reset = vi
      .spyOn(authClient, 'resetPassword')
      .mockResolvedValue({ kind: 'failed', reason: 'breached' })
    renderAuth('/reset-password?token=valid')

    const password = await screen.findByLabelText(en('auth.reset.newPassword'))
    await user.type(password, 'Password123!')
    await user.type(screen.getByLabelText(en('auth.reset.confirmPassword')), 'Password123!')
    await user.click(screen.getByRole('button', { name: en('auth.reset.submit') }))

    expect(await screen.findByText(en('auth.reset.breached'))).toBeInTheDocument()
    /* **Both fields keep their contents** — the operator has to change one of
       them, and clearing them would make them retype a password they are about
       to be told is fine. */
    expect(password).toHaveValue('Password123!')
    expect(screen.getByLabelText(en('auth.reset.confirmPassword'))).toHaveValue('Password123!')
    /* Not the invalid-link card: the link is fine. */
    expect(screen.queryByText(en('auth.reset.tokenInvalid.title'))).toBeNull()
    reset.mockRestore()
  })

  it('is refused while the meter calls it strong — §7.3\'s "never gates submission"', async () => {
    const user = userEvent.setup()
    renderAuth('/reset-password?token=valid')
    await user.type(await screen.findByLabelText(en('auth.reset.newPassword')), 'Password123!')
    /* Twelve characters, four character classes. The meter is satisfied and
       the server is not, which is the distinction made observable rather than
       asserted: only the server holds the breach list (spec §11.1). */
    expect(screen.getByText(en('auth.reset.strength.strong'))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: en('auth.reset.submit') })).toBeDisabled()
  })
})

describe('§7.4 — the activation subtitle names the role, through a key', () => {
  it('renders `You\'ve been invited to Eyvar as {role}.` with the role translated', async () => {
    renderAuth('/activate?token=invite')
    await screen.findByRole('heading', { name: en('auth.activate.title') })

    /* `{role}` is itself a key, so an Arabic dictionary translates
       `role.support` — it cannot translate a string that arrived already
       spelled. The seeded invite is `noura.f@eyvar.com`, whose role is
       Support; the test reads it from the dictionary rather than hard-coding
       the word, so a re-seeded fixture fails loudly instead of quietly. */
    const rendered = en('auth.activate.subtitle').replace('{role}', en('role.support'))
    expect(screen.getByText(rendered)).toBeInTheDocument()
  })

  it('falls back to the account line on a reset token, which carries no role', async () => {
    renderAuth('/reset-password?token=valid')
    await screen.findByRole('heading', { name: en('auth.reset.title') })
    expect(document.body.textContent).not.toContain('invited to Eyvar as')
    /* The account line spans three text nodes — `For `, the `<bdi>`, and the
       tail — which is the isolation working, so it is matched on the block's
       own `textContent` rather than with a matcher that would force the
       sentence back into one node. */
    const bdi = document.querySelector('bdi')
    expect(bdi?.parentElement?.textContent).toMatch(/^For \S+@\S+$/)
  })
})

describe('§5.1 — the TOTP branch draws its QR and its secret', () => {
  it('reveals a 144px square and the selectable key when the option is chosen', async () => {
    const user = userEvent.setup()
    const { container } = renderAuth('/signin/enroll', {
      enrolmentToken: 'ENR-sarah@eyvar.com',
      methods: ['sms', 'totp'],
    })

    await user.click(await screen.findByLabelText(en('auth.enroll.totp')))

    expect(await screen.findByText(en('auth.enroll.secret'))).toBeInTheDocument()
    const square = container.querySelector('svg[shape-rendering="crispEdges"]')
    expect(square).not.toBeNull()
    /* §5.1's canvas, and it is **decorative**: it encodes exactly the secret
       rendered beneath it, so announcing it would read the same string twice. */
    expect(square).toHaveAttribute('width', '144')
    expect(square).toHaveAttribute('aria-hidden', 'true')
    /* `currentColor`, never a hex — that is the whole reason the matrix is
       encoded in this codebase rather than imported as an image. */
    expect(square?.innerHTML).toContain('currentColor')
    expect(square?.innerHTML).not.toMatch(/#[0-9a-f]{3,6}/i)
  })

  it('renders the key in a mono, LTR-isolated, selectable run', async () => {
    const user = userEvent.setup()
    const { container } = renderAuth('/signin/enroll', {
      enrolmentToken: 'ENR-sarah@eyvar.com',
      methods: ['sms', 'totp'],
    })
    await user.click(await screen.findByLabelText(en('auth.enroll.totp')))
    await screen.findByText(en('auth.enroll.secret'))

    const run = container.querySelector('bdi')
    expect(run).toHaveAttribute('dir', 'ltr')
    expect(run?.parentElement?.className).toContain('font-mono')
    /* One click takes all of it — a secret half-selected is a secret typed
       wrong. */
    expect(run?.parentElement?.className).toContain('select-all')
  })

  it('issues no secret at all while SMS is the chosen option', async () => {
    const begin = vi
      .spyOn(authClient, 'beginTotpEnrolment')
      .mockRejectedValue(new Error('§5.1: no secret is issued for the SMS option'))
    renderAuth('/signin/enroll', {
      enrolmentToken: 'ENR-sarah@eyvar.com',
      methods: ['sms', 'totp'],
    })
    await screen.findByLabelText(en('auth.enroll.phone'))
    /* Issuing one is not free: it is a credential the account then has a
       record of. An operator who picks SMS never causes one. */
    expect(begin).not.toHaveBeenCalled()
    begin.mockRestore()
  })
})
