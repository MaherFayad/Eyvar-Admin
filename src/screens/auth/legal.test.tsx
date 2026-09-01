/**
 * **The auth card links nothing it cannot reach.** Design §1.3 rule 1, and the
 * rule `legal.ts` stated and then broke: *"a dead `Help` on a sign-in page is
 * worse than no `Help`"*.
 *
 * The defect this replaces was two `href`s — `/legal/privacy` and
 * `/legal/terms` — rendered on **all six** auth screens against routes that
 * exist nowhere. `AuthCard` renders the row as `<a href>`, a full document
 * load, and `routes.tsx` puts the `*` catch-all **inside `RequireSession`**, so
 * an operator asking to read the privacy policy before signing in was
 * redirected to the sign-in form they were already looking at.
 *
 * ## Why the second test is the one that matters
 *
 * *"`legalLinks()` is empty"* is a fact about today and it protects nothing —
 * the moment somebody adds a link back, it fails for the wrong reason and gets
 * deleted. **`every href resolves` is the rule**: it passes for an empty list,
 * it passes the day Admin › Workspace's `legal` pane gives the row real
 * destinations *that are routed*, and it fails for exactly one thing — a link
 * pointing somewhere the router cannot go. That is the defect, stated as a
 * predicate rather than as a count.
 *
 * The route table is read through `@/data/clients`, never from
 * `@/data/fixtures` — `seam.test.ts` fails the build on the latter.
 */

import * as React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { disableMockLatency, getRouteTable, resetDataLayer } from '@/data/clients'
import { EN } from '@/i18n/dictionaries'
import { createTranslator } from '@/lib'
import { ShellProvider, useShell } from '@/shell/ShellContext'
import { SignInScreen } from './index'
import { legalLinks } from './legal'

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
})

/**
 * The shell's session starts **authenticated** (`GET /session` succeeds, which
 * models a valid cookie), so `SignInScreen` redirects away before its card ever
 * mounts. Same gate `auth.test.tsx` uses, and for the same reason: a test of a
 * sign-in card has to sign out first.
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

/**
 * The six paths `routes.tsx` mounts **outside** `RequireSession`. Anything the
 * auth card links has to be reachable without a session — that is the whole
 * point of a privacy link on a sign-in page — so a route-table path alone is
 * not sufficient, and these are listed as the only public destinations.
 */
const PUBLIC_PATHS = [
  '/signin',
  '/signin/verify',
  '/signin/enroll',
  '/forgot-password',
  '/reset-password',
  '/activate',
] as const

describe('§1.3 rule 1 — the legal row links nothing it cannot reach', () => {
  it('every href the row declares resolves to a route that exists', () => {
    const t = createTranslator({ dictionary: EN })
    const routed = new Set<string>([
      ...PUBLIC_PATHS,
      ...getRouteTable().subTabs.map((row) => row.path),
    ])

    for (const link of legalLinks(t)) {
      expect(
        routed.has(link.href),
        `${link.label} points at ${link.href}, which no route mounts. A full page ` +
          `load lands on the catch-all INSIDE RequireSession — a signed-out ` +
          `operator is bounced to /signin. Route it or do not render it.`,
      ).toBe(true)
    }
  })

  it('an href outside RequireSession is required, not merely a route-table row', () => {
    const t = createTranslator({ dictionary: EN })
    for (const link of legalLinks(t)) {
      expect(
        link.href.startsWith('/legal'),
        `${link.href} is under /legal, which routes.tsx does not mount at all.`,
      ).toBe(false)
    }
  })

  it('the sign-in card renders no legal link at all today', async () => {
    render(
      <MemoryRouter initialEntries={['/signin']}>
        <ShellProvider>
          <SignedOut>
            <SignInScreen />
          </SignedOut>
        </ShellProvider>
      </MemoryRouter>,
    )

    /* Settle `ShellProvider`'s session read before asserting on an absence —
       an absence measured mid-mount is not evidence of anything. */
    await screen.findByRole('heading', { name: EN['auth.signin.title'] as string })

    /* Not "no link named Privacy" — no legal row. `AuthCard` drops the row
       entirely at `legal.length === 0` (AC-503's trailing clause), so the
       assertion is about every anchor on the card, which also catches a second
       dead link arriving under a different label. */
    for (const anchor of screen.queryAllByRole('link')) {
      expect(anchor.getAttribute('href') ?? '').not.toMatch(/^\/legal/)
    }
    expect(screen.queryByText(EN['auth.legal.privacy'] as string)).toBeNull()
    expect(screen.queryByText(EN['auth.legal.terms'] as string)).toBeNull()
  })
})
