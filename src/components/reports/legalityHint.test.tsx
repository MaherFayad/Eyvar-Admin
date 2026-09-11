/**
 * **The reason printed twice, and the reason that has to stay reachable.**
 *
 * Two defects the business owner sent a screenshot of, and one contract that
 * had to survive fixing them:
 *
 *   **The duplicate.** `planCohortGrains` (`plan.ts:679`) marks both `day` and
 *   `week` illegal with `rb.cohort.grainUnavailable`, and that sentence
 *   interpolates nothing — so the rail printed the same 33 words twice, one
 *   under the other. A dedupe keyed on the *option value* would not have caught
 *   it and a dedupe keyed on the *reason key* would over-collapse two options
 *   whose params legitimately differ. The unit is the **resolved sentence**,
 *   which is what an operator reads, and that is what is asserted here.
 *
 *   **The prose.** The surviving reasons moved off the page into an `InfoHint`.
 *   So this file opens the hint rather than reading the rail — a `getByText` on
 *   the panel would now assert the behaviour that was removed.
 *
 *   **AC-899, which did not move.** A disabled option still has to point at a
 *   node that exists and carries text. A tooltip's content is only in the DOM
 *   while it is open, so it can never be that node; the component keeps an
 *   always-mounted `sr-only` list for the `aria-describedby` targets. **Both**
 *   options that collapse to one sentence must resolve, which is the half of
 *   the fix that is easy to get wrong: dropping the `week` `<li>` and leaving
 *   `week`'s `aria-describedby` pointing at it is a dangling reference, and a
 *   disabled control whose reason has no target is worse than a duplicate.
 *
 * The options are the **planner's own**, not hand-written, so a change to the
 * cohort-grain rule reaches this test rather than sliding past it.
 */

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { EYVAR_TODAY, planReportQuery } from '@/data/clients'
import { EN } from '@/i18n/dictionaries'
import { createTranslator } from '@/lib'
import type { CohortGrain, OptionLegality, ReportQuery } from '@/data/types'
import { LegalityOptions } from './LegalityOptions'

const t = createTranslator({ dictionary: EN })

const HINT = EN['shell.hint.show'] as string
const GROUP = EN['rb.cohort.grain'] as string
const UNAVAILABLE = t('rb.cohort.grainUnavailable')

/* A cohort question, so `planReportQuery` returns the real `cohortGrains`.
   `planCohortGrains` reads nothing from the catalogue, so an empty one is
   honest here rather than a stub standing in for data. */
const COHORT: ReportQuery = {
  measures: [],
  groupBy: [],
  filters: [],
  window: { kind: 'preset', preset: 'last-365d' },
  grain: 'none',
  periodComparison: 'none',
  chartType: 'table',
  mode: 'cohort',
  cohort: {
    anchorMeasureKey: 'riders.joined',
    returnMeasureKeys: [],
    cohortGrain: 'month',
    method: 'rolling',
    brackets: null,
    horizon: 3,
  },
}

const GRAINS = planReportQuery(COHORT, { measures: [], dimensions: [] }, EYVAR_TODAY).cohortGrains

/**
 * **`ReportModePanel`'s own map, lifted so the expectations go through it too.**
 *
 * A reason may not render a raw enum at an operator, so the caller resolves
 * `grain` to its label. An expectation written against the raw param would be a
 * second, wrong copy of that rule — and this test caught exactly that.
 */
const resolveParams = (params: Record<string, string | number>) => ({
  ...params,
  ...(params['grain'] !== undefined
    ? { grain: t(`rb.cohortGrain.${String(params['grain'])}`) }
    : {}),
})

const sentenceOf = (option: OptionLegality<CohortGrain>) =>
  t(option.reasonKey!, resolveParams(option.reasonParams))

/** Exactly the props `ReportModePanel` gives it, so the test drives the real shape. */
function renderGrains(
  options: ReadonlyArray<OptionLegality<CohortGrain>> = GRAINS,
  extra: { disabled?: boolean; disabledReason?: string } = {},
) {
  return render(
    <LegalityOptions
      label={GROUP}
      options={options}
      value="month"
      onChange={() => {}}
      labelFor={(grain) => t(`rb.cohortGrain.${grain}`)}
      resolveParams={resolveParams}
      t={t}
      {...extra}
    />,
  )
}

describe('a reason two options share is one reason', () => {
  /* The fixture the whole file rests on. If the planner ever stops giving day
     and week the identical sentence, the duplicate this file was written for
     cannot occur and the assertions below would pass vacuously. */
  it('is the planner that hands two options the same words', () => {
    const illegal = GRAINS.filter((option) => !option.legal)
    expect(illegal.map((option) => option.value)).toEqual(['day', 'week'])
    expect(new Set(illegal.map((option) => t(option.reasonKey!, option.reasonParams))).size).toBe(1)
  })

  it('states it once, not once per option', async () => {
    const user = userEvent.setup()
    renderGrains()

    await user.hover(screen.getByRole('button', { name: HINT }))
    const tip = await screen.findByRole('tooltip')

    /* Not `getByText`, which would pass on one of two duplicates. The count is
       the assertion: this is the screenshot the owner sent. */
    expect(within(tip).getAllByText(UNAVAILABLE)).toHaveLength(1)
  })

  it('leaves both disabled options pointing at a reason that exists', async () => {
    renderGrains()

    for (const grain of ['day', 'week'] as const) {
      const option = screen.getByRole('button', { name: t(`rb.cohortGrain.${grain}`) })
      expect(option).toBeDisabled()

      /* The relationship, not the presence — `reports.test.tsx` AC-899's rule.
         Both collapse onto ONE surviving node, which is legal: nothing forbids
         two controls describing themselves with the same id. */
      const describedBy = option.getAttribute('aria-describedby')
      expect(describedBy).toBeTruthy()
      const reason = document.getElementById(describedBy!)
      expect(reason).not.toBeNull()
      expect(reason!.textContent).toBe(UNAVAILABLE)
    }

    /* And there is only one such node, which is the same fact the hint states
       once — the sr-only list and the hint cannot disagree, because both are
       built from the one deduplicated array. */
    expect(screen.getAllByText(UNAVAILABLE)).toHaveLength(1)
  })

  it('keeps two reasons when the two reasons are not the same', async () => {
    const user = userEvent.setup()
    /* Same key, DIFFERENT params, and a sentence that uses them: two options
       that a key-keyed dedupe would silently collapse into one. */
    const dayBelow: OptionLegality<CohortGrain> = {
      value: 'day',
      legal: false,
      reasonKey: 'rb.grain.belowMin',
      reasonParams: { grain: 'day', minGrain: 'week' },
    }
    const weekBelow: OptionLegality<CohortGrain> = {
      value: 'week',
      legal: false,
      reasonKey: 'rb.grain.belowMin',
      reasonParams: { grain: 'week', minGrain: 'month' },
    }
    renderGrains([dayBelow, weekBelow, { value: 'month', legal: true, reasonKey: null, reasonParams: {} }])

    await user.hover(screen.getByRole('button', { name: HINT }))
    const tip = await screen.findByRole('tooltip')
    expect(sentenceOf(dayBelow)).not.toBe(sentenceOf(weekBelow))
    expect(tip.textContent).toContain(sentenceOf(dayBelow))
    expect(tip.textContent).toContain(sentenceOf(weekBelow))

    /* Two surviving nodes, and the two options do NOT share one. */
    const day = screen.getByRole('button', { name: t('rb.cohortGrain.day') })
    const week = screen.getByRole('button', { name: t('rb.cohortGrain.week') })
    expect(day.getAttribute('aria-describedby')).not.toBe(week.getAttribute('aria-describedby'))
  })
})

describe('the hint is not hover-only', () => {
  /**
   * The owner asked for hover. **Hover alone fails SC 1.4.13 and fails every
   * keyboard operator**, so the same content has to arrive on focus and leave
   * on `Escape`. This is the assertion that stops a future "simplification"
   * back to a `title` attribute or a `<span onMouseEnter>`.
   */
  it('opens on focus and closes on Escape', async () => {
    const user = userEvent.setup()
    renderGrains()

    const hint = screen.getByRole('button', { name: HINT })
    /* Reached by Tab, not by `focus()` — a control out of the tab order would
       pass a programmatic focus and fail an operator. `month` is the group's
       first enabled option and the only one before the hint is behind it. */
    await user.tab()
    expect(hint).toHaveFocus()

    expect(await screen.findByRole('tooltip')).toHaveTextContent(UNAVAILABLE)

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('is a real button with a name of its own, never a bare span', () => {
    renderGrains()
    const hint = screen.getByRole('button', { name: HINT })
    expect(hint.tagName.toLowerCase()).toBe('button')
    expect(hint).toHaveAttribute('type', 'button')
    /* The name is the fixed key. Naming it with the sentence would make the
       control's own name change under the operator (§5.7). */
    expect(hint).toHaveAccessibleName(HINT)
  })
})

describe('a group that is off entirely keeps its reason on the page', () => {
  /**
   * The one sentence that did **not** move. An operator who cannot use any
   * option in the group needs to know why without first finding an icon — so
   * `disabledReason` stays rendered, and no hint is offered beside it, because
   * a second copy of it behind an `i` is the duplicate this file exists to
   * remove.
   */
  it('renders disabledReason as text and offers no hint', () => {
    const reason = t('rb.control.disabled.unstarted')
    renderGrains(GRAINS, { disabled: true, disabledReason: reason })

    expect(screen.getByText(reason)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: HINT })).toBeNull()
  })

  /**
   * **The dangling-reference case, which predates this change and is fixed
   * with it.** The per-option list is not rendered while the group is off, so
   * the old `aria-describedby={reasonId(option)}` pointed at a node that did
   * not exist — the exact failure AC-899 is written against, hidden in the one
   * state nobody screenshots. Every illegal option now points at the group's
   * own sentence instead.
   */
  it('points every illegal option at the group sentence rather than at nothing', () => {
    const reason = t('rb.control.disabled.unstarted')
    renderGrains(GRAINS, { disabled: true, disabledReason: reason })

    for (const grain of ['day', 'week'] as const) {
      const option = screen.getByRole('button', { name: t(`rb.cohortGrain.${grain}`) })
      const describedBy = option.getAttribute('aria-describedby')
      expect(describedBy).toBeTruthy()
      expect(document.getElementById(describedBy!)?.textContent).toBe(reason)
    }
  })
})
