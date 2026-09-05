/**
 * **QA (0.8) — the four state components: AC-35, AC-37, AC-38, AC-40, AC-69.**
 *
 * Written by qa-engineer. `src/components/` shipped with **no tests at all** in
 * 0.7, and four acceptance criteria live entirely inside these four files. The
 * build note records AC-35, AC-37 and AC-38 as "pass" on the strength of the
 * code reading correctly, which is not a verification.
 */

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { createTranslator } from '@/lib'
import { EN } from '@/i18n/dictionaries'
import { EmptyState } from './EmptyState'
import { ErrorState } from './ErrorState'
import { LoadingSkeleton, type SkeletonPattern } from './LoadingSkeleton'
import { Banner, BannerConditionList, mergeBanners, type BannerModel } from './Banner'

const PATTERNS: SkeletonPattern[] = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10']

/* ══════════════════════════════ AC-35 ═══════════════════════════════════ */

describe('AC-35 — "Every one of the ten §5.1 patterns has a loading skeleton … and none renders a centred spinner"', () => {
  it.each(PATTERNS)('renders a skeleton for pattern %s', (pattern) => {
    const { container, unmount } = render(<LoadingSkeleton pattern={pattern} />)
    expect(container.firstElementChild, pattern).not.toBeNull()
    expect(container.querySelectorAll('*').length, pattern).toBeGreaterThan(1)
    unmount()
  })

  it('renders an eleventh shape for the shell layer overlay', () => {
    const { container } = render(<LoadingSkeleton pattern="overlay" />)
    expect(container.querySelectorAll('*').length).toBeGreaterThan(1)
  })

  it('renders NO spinner in any of the eleven — a spinner is only legal inside a Save button', () => {
    for (const pattern of [...PATTERNS, 'overlay' as const]) {
      const { container, unmount } = render(<LoadingSkeleton pattern={pattern} />)
      expect(container.querySelector('[data-slot="spinner"]'), pattern).toBeNull()
      expect(within(container).queryByRole('status'), pattern).toBeNull()
      unmount()
    }
  })

  it('gives each pattern a DIFFERENT shape — a skeleton that matches nothing is not a skeleton', () => {
    const shapes = new Set<string>()
    for (const pattern of PATTERNS) {
      const { container, unmount } = render(<LoadingSkeleton pattern={pattern} />)
      shapes.add(container.innerHTML)
      unmount()
    }
    /* `P1`/`P9` and `P3`/`P4` deliberately share a shape (see the source), so
       ten patterns give eight distinct structures, not ten. */
    expect(shapes.size).toBe(8)
  })
})

/* ══════════════════════════ AC-37 and AC-38 ═════════════════════════════ */

describe('AC-37 — "An index table filtered to zero results shows the no-match empty state … and shows no illustration and no heading"', () => {
  it('renders one grey sentence, with no heading and no image', () => {
    const { container } = render(
      <EmptyState kind="no-match" message="No captains match these filters." />,
    )
    expect(screen.getByText('No captains match these filters.')).toBeInTheDocument()
    expect(screen.queryByRole('heading')).toBeNull()
    expect(container.querySelector('svg')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
  })

  it('carries a clear-filters action when one is given, and nothing else', async () => {
    const user = userEvent.setup()
    let cleared = false
    render(
      <EmptyState
        kind="no-match"
        message="No captains match these filters."
        action={{ label: 'Clear filters', onClick: () => { cleared = true } }}
      />,
    )
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(1)
    await user.click(buttons[0]!)
    expect(cleared).toBe(true)
  })
})

describe('AC-38 — "An index table with zero records ever shows the first-run empty state with an illustration, a heading, a body and at least one action"', () => {
  it('renders all four', () => {
    const { container } = render(
      <EmptyState
        kind="first-run"
        heading="Captains you approve appear here"
        body="Approve an application to see your first captain."
        actions={[{ label: 'Review applications', onClick: () => undefined }]}
      />,
    )
    expect(container.querySelector('svg')).not.toBeNull()
    expect(screen.getByRole('heading')).toHaveTextContent('Captains you approve appear here')
    expect(screen.getByText('Approve an application to see your first captain.')).toBeInTheDocument()
    expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(1)
  })

  it('is a DIFFERENT component branch from no-match — the two empties cannot be confused', () => {
    const first = render(
      <EmptyState kind="first-run" heading="H" body="B" actions={[{ label: 'A', onClick: () => undefined }]} />,
    )
    const firstHtml = first.container.innerHTML
    first.unmount()
    const match = render(<EmptyState kind="no-match" message="H" />)
    expect(match.container.innerHTML).not.toBe(firstHtml)
    expect(match.container.querySelector('h3')).toBeNull()
  })
})

/* ══════════════════════════════ AC-40 ═══════════════════════════════════ */

describe('AC-40 — "exactly one full-width banner … impersonating AND offline shows one banner carrying a count, not two"', () => {
  const impersonating: BannerModel = { id: 'impersonating', tone: 'warning', title: 'You are acting as Nora.' }
  const offline: BannerModel = { id: 'offline', tone: 'critical', title: 'You are offline.' }
  const call: BannerModel = { id: 'call-active', tone: 'info', title: 'On a call.' }

  it('returns null for no conditions', () => {
    expect(mergeBanners([], (n) => `${n}`)).toBeNull()
  })

  it('returns the condition itself when exactly one is true', () => {
    expect(mergeBanners([impersonating], (n) => `${n}`)).toBe(impersonating)
  })

  it('merges two into ONE carrying the count', () => {
    const merged = mergeBanners([impersonating, offline], (n) => `${n} conditions need your attention.`)
    expect(merged).not.toBeNull()
    expect(merged!.title).toBe('2 conditions need your attention.')
  })

  it('takes the MOST SEVERE tone, so a merged banner never under-reports', () => {
    expect(mergeBanners([impersonating, offline], (n) => `${n}`)!.tone).toBe('critical')
    expect(mergeBanners([impersonating, call], (n) => `${n}`)!.tone).toBe('warning')
  })

  it('renders exactly one alert element even with three conditions', () => {
    const merged = mergeBanners([impersonating, offline, call], (n) => `${n} conditions need your attention.`)!
    render(
      <Banner banner={merged} variant="shell">
        <BannerConditionList lines={[impersonating.title, offline.title, call.title]} />
      </Banner>,
    )
    expect(screen.getAllByRole('alert')).toHaveLength(1)
    expect(screen.getByRole('alert')).toHaveTextContent('3 conditions need your attention.')
    /* …and nothing is lost: every condition still has a line. */
    expect(screen.getByRole('alert')).toHaveTextContent('You are offline.')
  })

  it('caps the merged banner at two actions (§4.2), never one per condition', () => {
    const withActions = [1, 2, 3].map<BannerModel>((n) => ({
      id: `c${n}`,
      tone: 'warning',
      title: `Condition ${n}`,
      actions: [{ label: `Fix ${n}`, onClick: () => undefined }],
    }))
    expect(mergeBanners(withActions, (n) => `${n}`)!.actions).toHaveLength(2)
  })
})

/* ══════════════════════════════ AC-41 ═══════════════════════════════════ */

describe('AC-41 — "A row action that fails renders an error scoped to that row … and no page-level banner appears"', () => {
  it('scopes the row error to an inline element with no heading and no page banner', () => {
    const page = render(
      <ErrorState scope="page" heading="Couldn't load captains" message="The data didn't arrive." action={{ label: 'Try again', onClick: () => undefined }} />,
    )
    expect(screen.getByRole('heading')).toBeInTheDocument()
    page.unmount()

    const { container } = render(
      <ErrorState scope="row" message="Couldn't suspend this captain." action={{ label: 'Try again', onClick: () => undefined }} />,
    )
    /* Inline, so it sits INSIDE the row rather than replacing the page. */
    expect(container.firstElementChild?.tagName).toBe('SPAN')
    expect(within(container).queryByRole('heading')).toBeNull()
    /* And it is not the shared `Banner` — a page-level banner is what AC-41
       forbids here. */
    expect(container.querySelector('[data-slot="banner"]')).toBeNull()
  })

  it('gives all three scopes a distinct structure, so the wrong scope is visible', () => {
    const html = (['page', 'card', 'row'] as const).map((scope) => {
      const { container, unmount } = render(
        <ErrorState scope={scope} message="Something did not arrive." action={{ label: 'Try again', onClick: () => undefined }} />,
      )
      const out = container.innerHTML
      unmount()
      return out
    })
    expect(new Set(html).size).toBe(3)
  })

  it('always names a retry action when one is supplied (AC-36)', async () => {
    const user = userEvent.setup()
    let retried = 0
    render(
      <ErrorState scope="page" heading="Couldn't load captains" message="The data didn't arrive." action={{ label: 'Try again', onClick: () => { retried += 1 } }} />,
    )
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(retried).toBe(1)
  })
})

/* ══════════════════════════════ AC-69 ═══════════════════════════════════ */

describe('AC-69 — "With prefers-reduced-motion: reduce set, no element in the shell animates indefinitely"', () => {
  it('is carried by a GLOBAL guard, so a component cannot forget it', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const css = readFileSync(join(process.cwd(), 'src', 'styles', 'globals.css'), 'utf8')
    const guard = /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\}\s*\}/.exec(css)?.[0]
    expect(guard, 'no reduced-motion guard in globals.css').toBeTruthy()
    /* The guard must cap ITERATION COUNT, not merely shorten the duration — an
       infinite animation at 1ms is still infinite. */
    expect(guard).toMatch(/animation-iteration-count:\s*1\s*!important/)
    expect(guard).toMatch(/\*,/)
    expect(guard).toMatch(/\*::before/)
    expect(guard).toMatch(/\*::after/)
  })

  it('has an indefinite animation for that guard to catch, so the guard is load-bearing', () => {
    const { container } = render(<LoadingSkeleton pattern="P1" />)
    const animated = container.querySelectorAll('[class*="animate-"]')
    expect(animated.length).toBeGreaterThan(0)
  })
})

/* ══════════════════ X15 — the empty state's hint slot ═══════════════════ */

/**
 * The sentence a one-line body cannot hold, asked for rather than read. It
 * explains and does not change what the operator does next, so X15 puts it
 * behind the icon; the body beside it still says everything needed to act.
 */
describe('X15 — an empty state explains itself on request, in every arm', () => {
  const t = createTranslator({ dictionary: EN })

  it('opens the sentence from the first-run heading', async () => {
    const user = userEvent.setup()
    render(
      <EmptyState
        kind="first-run"
        heading="Your work, across every queue"
        body="Anything you hold or nobody has picked up, sorted by deadline."
        actions={[{ label: 'Show every queue', onClick: () => undefined }]}
        hint="It spans every queue from Requests to Safety."
        t={t}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'What this means' }))
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'It spans every queue from Requests to Safety.',
    )
  })

  it('opens the sentence from the no-match line, which has no heading to hang it on', async () => {
    const user = userEvent.setup()
    render(
      <EmptyState
        kind="no-match"
        message="Nothing is open in the queues routed to your role."
        hint="Other queues may still have work."
        t={t}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'What this means' }))
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Other queues may still have work.',
    )
  })

  it('opens the sentence from the cleared heading', async () => {
    const user = userEvent.setup()
    render(
      <EmptyState
        kind="cleared"
        heading="Nothing owed"
        body="Every queue is clear."
        hint="Routing decides which queues count."
        t={t}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'What this means' }))
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Routing decides which queues count.',
    )
  })

  it('draws no icon at all when the arm has no hint', () => {
    render(<EmptyState kind="cleared" heading="Nothing owed" body="Every queue is clear." t={t} />)
    expect(screen.queryByRole('button', { name: 'What this means' })).toBeNull()
  })
})
