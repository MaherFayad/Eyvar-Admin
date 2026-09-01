/**
 * **P8-T1's one hard rule, tested where it can be made non-vacuous.**
 *
 * *"An unresolvable name renders as plain text rather than a dead link."*
 *
 * That branch cannot be exercised from a screen today: every captain, rider,
 * trip and subscription reference on every Financials fixture resolves. A DOM
 * test over the real tables would pass equally well against a component that
 * linked everything with the right prefix — which is the implementation this
 * one deliberately is not. So the resolver is driven directly, with an id that
 * is on no record.
 *
 * **No spies.** `resolveProfile` is called for real; the 404 the mock raises is
 * the answer under test. Both halves are asserted in one test — a resolvable id
 * beside an unresolvable one — because asserting only the absence would pass
 * against a component that renders no links at all.
 */

import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { disableMockLatency, resetDataLayer } from '@/data/clients'
import { createTranslator } from '@/lib'
import { EN } from '@/i18n/dictionaries'
import { EntityName, resetEntityLinkCache, useEntityLinks } from './entityLinks'

const t = createTranslator({ dictionary: EN, fallback: EN })

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
  resetEntityLinkCache()
})

/** Four references: two real records, one plausible-but-absent, one non-entity. */
const IDS = ['DRV-0101', 'TRP-7742', 'DRV-9999', 'ESC-1052'] as const

function Harness() {
  const hrefFor = useEntityLinks(IDS)
  return (
    <ul>
      {IDS.map((id) => (
        <li key={id}>
          <EntityName href={hrefFor(id)} name={id} t={t} code />
        </li>
      ))}
    </ul>
  )
}

function mount() {
  return render(
    <MemoryRouter initialEntries={['/financials/payouts?view=payouts']}>
      <Harness />
    </MemoryRouter>,
  )
}

describe('a name opens its entity, and only when there is one to open', () => {
  it('links what resolves, and leaves what does not as plain text', async () => {
    mount()

    /* The positive half first, and it is what makes the rest meaningful: two
       real records become links with the profile overlay in their href. */
    await waitFor(() => expect(screen.getByText('DRV-0101').closest('a')).toBeTruthy())
    expect(screen.getByText('DRV-0101').closest('a')?.getAttribute('href')).toContain(
      'entity=DRV-0101',
    )
    await waitFor(() => expect(screen.getByText('TRP-7742').closest('a')).toBeTruthy())

    /* **A captain id shaped exactly like a real one, on no record.** A
       prefix-only implementation links this into the profile's not-found
       state; this one asks, is told 404, and renders text. */
    expect(screen.getByText('DRV-9999').closest('a')).toBeNull()

    /* An escrow hold is a document with no profile and no route. It is never
       asked about at all — the prefix filter keeps it from costing a 404. */
    expect(screen.getByText('ESC-1052').closest('a')).toBeNull()
  })

  /**
   * §3.10 — the overlay, not the full-page escape. A table cell that navigated
   * to `/entity/:id` would drop the operator out of the list they were reading;
   * `?entity=` opens the profile over it and Back closes the layer.
   */
  it('opens the profile as an overlay on the current route, keeping the view', async () => {
    mount()
    await waitFor(() => expect(screen.getByText('DRV-0101').closest('a')).toBeTruthy())

    const href = screen.getByText('DRV-0101').closest('a')?.getAttribute('href') ?? ''
    expect(href.startsWith('/financials/payouts')).toBe(true)
    expect(href).toContain('view=payouts')
    expect(href).not.toContain('/entity/')
  })

  /** AC-75 — one key, the name interpolated, never a label built at the call site. */
  it('names the link with one interpolated key', async () => {
    mount()
    await waitFor(() =>
      expect(
        screen.getByRole('link', {
          name: (EN['fin.a11y.openProfile'] as string).replace('{name}', 'DRV-0101'),
        }),
      ).toBeTruthy(),
    )
  })
})
