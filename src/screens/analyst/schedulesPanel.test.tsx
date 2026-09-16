/**
 * `SchedulesPanel`'s owner line — AR2, a raw operator id substituted into a
 * translated sentence still needs `<bdi>` isolation.
 */

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { disableMockLatency, resetDataLayer } from '@/data/clients'
import { EN } from '@/i18n/dictionaries'
import { createTranslator } from '@/lib'
import { SchedulesPanel } from './SchedulesPanel'

const t = createTranslator({ dictionary: EN })

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
})

describe('AR2 — the owner line bidi-isolates a raw operator id', () => {
  it('wraps USR-1 in a <bdi> for a schedule owned by someone else', async () => {
    render(<SchedulesPanel currentUserId="USR-2" t={t} language="en" />)

    const idNode = await screen.findByText('USR-1')
    expect(idNode.tagName).toBe('BDI')
    expect(idNode.closest('span')?.textContent).toMatch(/Owner USR-1$/)
  })

  it('renders the translated "You" as plain text, not isolated, for the schedule’s own owner', async () => {
    render(<SchedulesPanel currentUserId="USR-1" t={t} language="en" />)

    const line = await screen.findByText(/Owner You$/)
    expect(line.querySelector('bdi')).toBeNull()
  })
})
