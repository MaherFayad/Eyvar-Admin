import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/data/types/common'
import { parseNumericInput } from '@/lib/parse/input'
import { useForm, type FormErrors } from './useForm'

/* ─────────────────────── The plan editor, as a fixture ─────────────────────── */

interface PlanValues {
  name: string
  pricePerMinute: number | null
  discountPercent: number | null
  eyvarPercent: number | null
  cities: string[]
}

const SAVED: PlanValues = {
  name: 'Weekly — Riyadh North',
  pricePerMinute: 120,
  discountPercent: 10,
  eyvarPercent: 20,
  cities: ['riyadh'],
}

/**
 * §8.2's chain, in evaluation order — legacy `cr()` at
 * `eyvar_ops_panel_v40_fixed.html:12986` and the driver share at `:12988`.
 * `null` in, `null` out: §8.2's "no computable result".
 */
function derivePlan(values: PlanValues) {
  const gross = values.pricePerMinute === null ? null : values.pricePerMinute * 20
  const discounted =
    gross === null || values.discountPercent === null ? null : Math.round(gross * (1 - values.discountPercent / 100))
  const driverShare = values.eyvarPercent === null ? null : 100 - values.eyvarPercent
  return { grossPerTrip: gross, planTotal: discounted, driverSharePercent: driverShare }
}

/** Copy is the caller's. §8.2: the error goes on the input, never on the result. */
function validatePlan(values: PlanValues): FormErrors<PlanValues> {
  const errors: { name?: string; discountPercent?: string; eyvarPercent?: string } = {}
  if (values.name.trim() === '') errors.name = 'Enter a plan name.'
  if (values.discountPercent === null || values.discountPercent < 0 || values.discountPercent > 100) {
    errors.discountPercent = 'Enter a discount between 0 and 100.'
  }
  if (values.eyvarPercent === null || values.eyvarPercent < 0 || values.eyvarPercent > 100) {
    errors.eyvarPercent = 'Enter a commission between 0 and 100.'
  }
  return errors
}

type SubmitPlan = (values: PlanValues) => Promise<PlanValues | void>

function renderPlanForm(onSubmit: SubmitPlan = vi.fn(async () => {})) {
  return renderHook(() =>
    useForm({
      initialValues: SAVED,
      derive: derivePlan,
      validate: validatePlan,
      onSubmit,
      id: 'plan',
    }),
  )
}

/* ───────────────────────────── Dirty tracking ──────────────────────────────── */

describe('dirty tracking — the save bar exists only because of this (D2)', () => {
  it('starts clean, so no save bar renders', () => {
    const { result } = renderPlanForm()
    expect(result.current.status).toBe('clean')
    expect(result.current.isDirty).toBe(false)
    expect(result.current.canSave).toBe(false)
    expect(result.current.canDiscard).toBe(false)
    expect(result.current.dirtyFields).toEqual([])
  })

  it('goes dirty → pristine → dirty as the operator types and types back', () => {
    const { result } = renderPlanForm()

    act(() => result.current.setValue('name', 'Weekly — Riyadh South'))
    expect(result.current.status).toBe('dirty')
    expect(result.current.dirtyFields).toEqual(['name'])

    // Typing the saved value back is not a change. The save bar must go away —
    // this is the case a `hasEdited` boolean gets wrong, and the reason dirty is
    // a comparison and not a flag.
    act(() => result.current.setValue('name', SAVED.name))
    expect(result.current.status).toBe('clean')
    expect(result.current.isDirty).toBe(false)
    expect(result.current.dirtyFields).toEqual([])

    act(() => result.current.setValue('name', 'Weekly — Jeddah'))
    expect(result.current.status).toBe('dirty')
  })

  it('compares an array field by content, so a tag input does not stick dirty', () => {
    const { result } = renderPlanForm()
    act(() => result.current.setValue('cities', ['riyadh', 'jeddah']))
    expect(result.current.isDirty).toBe(true)
    act(() => result.current.setValue('cities', ['riyadh']))
    expect(result.current.isDirty).toBe(false)
  })

  it('separates a cleared field from a zero', () => {
    const { result } = renderPlanForm()
    act(() => result.current.setValue('discountPercent', 0))
    expect(result.current.isDirty).toBe(true)
    act(() => result.current.setValue('discountPercent', null))
    expect(result.current.isDirty).toBe(true)
    expect(result.current.values.discountPercent).toBeNull()
  })

  it('lists every dirty field, and only the dirty ones', () => {
    const { result } = renderPlanForm()
    act(() => result.current.setValues({ name: 'X', eyvarPercent: 25 }))
    expect([...result.current.dirtyFields].sort()).toEqual(['eyvarPercent', 'name'])
  })

  it('reports per-field dirtiness on the binding', () => {
    const { result } = renderPlanForm()
    act(() => result.current.setValue('name', 'X'))
    expect(result.current.field('name').isDirty).toBe(true)
    expect(result.current.field('eyvarPercent').isDirty).toBe(false)
  })

  it('discard returns to the last saved values and hides the bar (AC-52 pair)', () => {
    const { result } = renderPlanForm()
    act(() => result.current.setValues({ name: 'X', discountPercent: 140 }))
    expect(result.current.status).toBe('dirty-invalid')

    act(() => result.current.discard())
    expect(result.current.status).toBe('clean')
    expect(result.current.values).toEqual(SAVED)
    expect(result.current.errors).toEqual({})
    expect(result.current.failure).toBeNull()
  })

  it('reset adopts a new saved baseline — the record loaded, or was saved elsewhere', () => {
    const { result } = renderPlanForm()
    act(() => result.current.setValue('name', 'X'))
    expect(result.current.isDirty).toBe(true)

    const arrived: PlanValues = { ...SAVED, name: 'Weekly — Dammam' }
    act(() => result.current.reset(arrived))
    expect(result.current.status).toBe('clean')
    expect(result.current.values).toEqual(arrived)

    // ...and the new baseline is what dirty is measured against.
    act(() => result.current.setValue('name', SAVED.name))
    expect(result.current.isDirty).toBe(true)
  })
})

/* ───────────────────────── The save bar's five states ──────────────────────── */

describe('status maps 1:1 onto design spec §11.6 rows 5–9', () => {
  it('row 5 — dirty: Save and Discard both enabled', () => {
    const { result } = renderPlanForm()
    act(() => result.current.setValue('name', 'X'))
    expect(result.current.status).toBe('dirty')
    expect(result.current.canSave).toBe(true)
    expect(result.current.canDiscard).toBe(true)
  })

  it('row 6 — dirty-invalid: Save greyed, Discard still enabled (AC-52)', () => {
    const { result } = renderPlanForm()
    act(() => result.current.setValue('discountPercent', 140))
    expect(result.current.status).toBe('dirty-invalid')
    expect(result.current.canSave).toBe(false)
    expect(result.current.canDiscard).toBe(true)
  })

  it('row 7 — save-in-flight: Save not re-triggerable, Discard disabled', async () => {
    let release: () => void = () => {}
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve
        }),
    )
    const { result } = renderPlanForm(onSubmit)

    act(() => result.current.setValue('name', 'X'))
    act(() => void result.current.submit())

    await waitFor(() => expect(result.current.status).toBe('save-in-flight'))
    expect(result.current.isSaving).toBe(true)
    expect(result.current.canSave).toBe(false)
    expect(result.current.canDiscard).toBe(false)

    // §4.1: "is not re-triggerable". A second press must not send a second save.
    await act(async () => {
      await result.current.submit()
    })
    expect(onSubmit).toHaveBeenCalledTimes(1)

    await act(async () => {
      release()
    })
    expect(result.current.status).toBe('clean')
  })

  it('a successful save makes the submitted values the new baseline', async () => {
    const onSubmit = vi.fn(async () => {})
    const { result } = renderPlanForm(onSubmit)
    act(() => result.current.setValue('name', 'Weekly — Jeddah'))
    await act(async () => {
      await result.current.submit()
    })
    expect(onSubmit).toHaveBeenCalledWith({ ...SAVED, name: 'Weekly — Jeddah' })
    expect(result.current.status).toBe('clean')
    expect(result.current.values.name).toBe('Weekly — Jeddah')
  })

  it('adopts the server’s canonical values when onSubmit returns them', async () => {
    const onSubmit = vi.fn(async (values: PlanValues) => ({ ...values, name: values.name.trim() }))
    const { result } = renderPlanForm(onSubmit)
    act(() => result.current.setValue('name', '  Weekly — Jeddah  '))
    await act(async () => {
      await result.current.submit()
    })
    expect(result.current.values.name).toBe('Weekly — Jeddah')
    expect(result.current.status).toBe('clean')
  })

  it('refuses to send an invalid form even if Save was somehow pressed', async () => {
    const onSubmit = vi.fn(async () => {})
    const { result } = renderPlanForm(onSubmit)
    act(() => result.current.setValue('discountPercent', 140))
    await act(async () => {
      await result.current.submit()
    })
    expect(onSubmit).not.toHaveBeenCalled()
    expect(result.current.status).toBe('save-failed')
  })
})

/* ──────────────────────────── Failure, then repair ─────────────────────────── */

describe('a submit that fails', () => {
  it('row 9 — a rejection that is not about a field keeps the form dirty', async () => {
    const onSubmit = vi.fn(async () => {
      throw new ApiError({ status: 503, message: 'Injected failure' })
    })
    const { result } = renderPlanForm(onSubmit)

    act(() => result.current.setValue('name', 'X'))
    await act(async () => {
      await result.current.submit()
    })

    expect(result.current.status).toBe('save-failed')
    expect(result.current.isDirty).toBe(true)
    expect(result.current.isSaving).toBe(false)
    expect(result.current.failure).toEqual({ kind: 'rejected', error: expect.any(ApiError) })
    // Nothing was changed: the values the operator typed are still there.
    expect(result.current.values.name).toBe('X')
  })

  it('normalises a thrown non-Error, because a banner still has to render', async () => {
    const onSubmit = vi.fn(async () => {
      throw 'nope'
    })
    const { result } = renderPlanForm(onSubmit)
    act(() => result.current.setValue('name', 'X'))
    await act(async () => {
      await result.current.submit()
    })
    expect(result.current.failure?.kind).toBe('rejected')
    if (result.current.failure?.kind === 'rejected') {
      expect(result.current.failure.error).toBeInstanceOf(Error)
    }
  })

  it('row 8 — a 422 becomes field errors plus a counted banner', async () => {
    const onSubmit = vi.fn(async () => {
      throw new ApiError({
        status: 422,
        message: 'Validation failed',
        details: [
          { field: 'discountPercent', code: 'range', message: 'Enter a discount between 0 and 100.' },
          { field: 'eyvarPercent', code: 'range', message: 'Enter a commission between 0 and 100.' },
        ],
      })
    })
    const { result } = renderPlanForm(onSubmit)

    act(() => result.current.setValue('name', 'X'))
    await act(async () => {
      await result.current.submit()
    })

    expect(result.current.status).toBe('save-failed')
    expect(result.current.failure?.kind).toBe('validation')
    // The count the banner states: "To save this plan, 2 changes need to be made:"
    expect(result.current.issues).toHaveLength(2)
    expect(result.current.field('discountPercent').error).toBe('Enter a discount between 0 and 100.')
    expect(result.current.canSave).toBe(false)
  })

  it('lists blocking items in field declaration order, not hash order', async () => {
    const { result } = renderHook(() =>
      useForm({
        initialValues: SAVED,
        validate: () => ({
          eyvarPercent: 'Enter a commission between 0 and 100.',
          name: 'Enter a plan name.',
          discountPercent: 'Enter a discount between 0 and 100.',
        }),
        onSubmit: async () => {},
      }),
    )
    act(() => result.current.setValue('cities', ['jeddah']))
    await act(async () => {
      await result.current.submit()
    })
    expect(result.current.issues.map((issue) => issue.field)).toEqual([
      'name',
      'discountPercent',
      'eyvarPercent',
    ])
  })

  it('falls back to the rejected banner when the details name fields this form has not got', async () => {
    const onSubmit = vi.fn(async () => {
      throw new ApiError({
        status: 422,
        message: 'Validation failed',
        details: [{ field: 'vehicleClass', code: 'range', message: 'Pick a vehicle class.' }],
      })
    })
    const { result } = renderPlanForm(onSubmit)
    act(() => result.current.setValue('name', 'X'))
    await act(async () => {
      await result.current.submit()
    })
    // A message that cannot be attached to a control must not disappear.
    expect(result.current.failure?.kind).toBe('rejected')
  })
})

describe('a submit that fails, and then the operator edits', () => {
  it('clears that field’s server error and lets the banner’s count come down', async () => {
    const onSubmit = vi.fn(async () => {
      throw new ApiError({
        status: 422,
        message: 'Validation failed',
        details: [
          { field: 'name', code: 'taken', message: 'Another plan already uses this name.' },
          { field: 'cities', code: 'empty', message: 'Pick at least one city.' },
        ],
      })
    })
    const { result } = renderPlanForm(onSubmit)

    act(() => result.current.setValue('name', 'Weekly — Jeddah'))
    await act(async () => {
      await result.current.submit()
    })
    expect(result.current.issues).toHaveLength(2)

    act(() => result.current.setValue('name', 'Weekly — Dammam'))
    expect(result.current.issues.map((issue) => issue.field)).toEqual(['cities'])
    expect(result.current.field('name').error).toBeNull()
    expect(result.current.status).toBe('save-failed')

    act(() => result.current.setValue('cities', ['jeddah']))
    // Nothing blocking is left: the banner goes and Save comes back.
    expect(result.current.issues).toEqual([])
    expect(result.current.failure).toBeNull()
    expect(result.current.status).toBe('dirty')
    expect(result.current.canSave).toBe(true)
  })

  it('drops a non-field rejection as soon as the payload changes', async () => {
    const onSubmit = vi.fn(async () => {
      throw new ApiError({ status: 503, message: 'Injected failure' })
    })
    const { result } = renderPlanForm(onSubmit)
    act(() => result.current.setValue('name', 'X'))
    await act(async () => {
      await result.current.submit()
    })
    expect(result.current.failure?.kind).toBe('rejected')

    act(() => result.current.setValue('name', 'Y'))
    // "Nothing was changed. Try again." no longer describes what is on screen.
    expect(result.current.failure).toBeNull()
    expect(result.current.status).toBe('dirty')
  })

  it('recovers cleanly when the retry succeeds', async () => {
    let attempt = 0
    const onSubmit = vi.fn(async () => {
      attempt += 1
      if (attempt === 1) throw new ApiError({ status: 503, message: 'Injected failure' })
    })
    const { result } = renderPlanForm(onSubmit)

    act(() => result.current.setValue('name', 'X'))
    await act(async () => {
      await result.current.submit()
    })
    expect(result.current.status).toBe('save-failed')

    await act(async () => {
      await result.current.submit()
    })
    expect(result.current.status).toBe('clean')
    expect(result.current.failure).toBeNull()
    expect(result.current.errors).toEqual({})
  })

  it('discards a failure along with the values', async () => {
    const onSubmit = vi.fn(async () => {
      throw new ApiError({ status: 503, message: 'Injected failure' })
    })
    const { result } = renderPlanForm(onSubmit)
    act(() => result.current.setValue('name', 'X'))
    await act(async () => {
      await result.current.submit()
    })
    act(() => result.current.discard())
    expect(result.current.status).toBe('clean')
    expect(result.current.failure).toBeNull()
  })

  it('ignores a save that lands after the record was reset underneath it', async () => {
    let release: () => void = () => {}
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve
        }),
    )
    const { result } = renderPlanForm(onSubmit)

    act(() => result.current.setValue('name', 'X'))
    act(() => void result.current.submit())
    await waitFor(() => expect(result.current.isSaving).toBe(true))

    const arrived: PlanValues = { ...SAVED, name: 'Weekly — Dammam' }
    act(() => result.current.reset(arrived))
    await act(async () => {
      release()
    })

    // The in-flight save described a record the caller has replaced.
    expect(result.current.values).toEqual(arrived)
    expect(result.current.status).toBe('clean')
  })
})

/* ──────────────────────────── Error visibility ─────────────────────────────── */

describe('when a field error becomes visible', () => {
  it('does not shout at an untouched field', () => {
    const { result } = renderHook(() =>
      useForm({
        initialValues: { name: '' },
        validate: (values) => (values.name === '' ? { name: 'Enter a plan name.' } : {}),
        onSubmit: async () => {},
      }),
    )
    expect(result.current.isValid).toBe(false)
    expect(result.current.errors).toEqual({})
    expect(result.current.field('name').error).toBeNull()
    expect(result.current.field('name').controlProps['aria-invalid']).toBeUndefined()
  })

  it('shows the message once the field is blurred, and wires the ARIA (§10.4)', () => {
    const { result } = renderPlanForm()
    act(() => result.current.setValue('discountPercent', 140))
    act(() => result.current.field('discountPercent').onBlur())

    const field = result.current.field('discountPercent')
    expect(field.error).toBe('Enter a discount between 0 and 100.')
    expect(field.isTouched).toBe(true)
    expect(field.controlProps['aria-invalid']).toBe(true)
    expect(field.controlProps['aria-describedby']).toBe(field.errorId)
    expect(field.errorId).toBe('plan-discountPercent-error')
    expect(field.controlProps.id).toBe('plan-discountPercent')
    expect(field.labelId).toBe('plan-discountPercent-label')
  })

  it('shows every message once a save has been attempted', async () => {
    const { result } = renderPlanForm()
    act(() => result.current.setValues({ name: '', discountPercent: 140 }))
    expect(result.current.errors).toEqual({})

    await act(async () => {
      await result.current.submit()
    })
    expect(result.current.errors).toEqual({
      name: 'Enter a plan name.',
      discountPercent: 'Enter a discount between 0 and 100.',
    })
  })

  it('lets a caller attach a message no validator could know', () => {
    const { result } = renderPlanForm()
    act(() => result.current.setValue('name', 'Weekly — Jeddah'))
    act(() => result.current.setFieldError('name', 'Another plan already uses this name.'))
    act(() => result.current.field('name').onBlur())
    expect(result.current.field('name').error).toBe('Another plan already uses this name.')
    expect(result.current.canSave).toBe(false)

    act(() => result.current.setFieldError('name', null))
    expect(result.current.field('name').error).toBeNull()
    expect(result.current.canSave).toBe(true)
  })

  it('prefers a live validation message over a stale one from the server', async () => {
    const onSubmit = vi.fn(async () => {
      throw new ApiError({
        status: 422,
        message: 'Validation failed',
        details: [{ field: 'discountPercent', code: 'range', message: 'Server says no.' }],
      })
    })
    const { result } = renderPlanForm(onSubmit)
    act(() => result.current.setValue('name', 'X'))
    await act(async () => {
      await result.current.submit()
    })
    expect(result.current.field('discountPercent').error).toBe('Server says no.')

    act(() => result.current.setValue('discountPercent', 140))
    expect(result.current.field('discountPercent').error).toBe('Enter a discount between 0 and 100.')
  })
})

/* ───────────────────────────── Derived values ──────────────────────────────── */

describe('derived values (§8.2)', () => {
  it('computes from the values and is never stored among them', () => {
    const { result } = renderPlanForm()
    expect(result.current.derived).toEqual({
      grossPerTrip: 2400,
      planTotal: 2160,
      driverSharePercent: 80,
    })
    expect(Object.keys(result.current.values)).not.toContain('planTotal')
  })

  it('recomputes when the input it reads changes', () => {
    const { result } = renderPlanForm()
    act(() => result.current.setValue('pricePerMinute', 240))
    expect(result.current.derived.grossPerTrip).toBe(4800)
    expect(result.current.derived.planTotal).toBe(4320)

    act(() => result.current.setValue('discountPercent', 50))
    expect(result.current.derived.planTotal).toBe(2400)
  })

  it('a recompute is not an edit — it never enters the dirty set (§8.2.5)', () => {
    const { result } = renderPlanForm()
    // Computing every derived value at mount leaves the form clean...
    expect(result.current.derived.planTotal).toBe(2160)
    expect(result.current.status).toBe('clean')

    // ...and an edit dirties only the field that was edited, never the three
    // values that changed as a consequence.
    act(() => result.current.setValue('discountPercent', 50))
    expect(result.current.derived.planTotal).toBe(1200)
    expect(result.current.dirtyFields).toEqual(['discountPercent'])

    // Reverting the input reverts the derived value and the save bar goes.
    act(() => result.current.setValue('discountPercent', SAVED.discountPercent))
    expect(result.current.derived.planTotal).toBe(2160)
    expect(result.current.status).toBe('clean')
  })

  it('stays clean through a reset, however much the derived values move', () => {
    const { result } = renderPlanForm()
    act(() => result.current.reset({ ...SAVED, pricePerMinute: 1000 }))
    expect(result.current.derived.grossPerTrip).toBe(20000)
    expect(result.current.status).toBe('clean')
  })

  it('reports "no computable result" so the caller can render an em-dash, never 0', () => {
    const { result } = renderPlanForm()
    act(() => result.current.setValue('pricePerMinute', null))

    const gross = result.current.derivedValue('grossPerTrip')
    expect(gross.value).toBeNull()
    expect(gross.isComputable).toBe(false)
    // The trap the rule exists for: a blank input must not read as free.
    expect(gross.value).not.toBe(0)
    expect(result.current.derivedValue('planTotal').isComputable).toBe(false)
  })

  it('treats NaN and Infinity as no computable result too', () => {
    const { result } = renderHook(() =>
      useForm({
        initialValues: { a: 0, b: 0 },
        derive: (values) => ({ ratio: values.a / values.b }),
        onSubmit: async () => {},
      }),
    )
    expect(Number.isNaN(result.current.derivedValue('ratio').value)).toBe(true)
    expect(result.current.derivedValue('ratio').isComputable).toBe(false)

    act(() => result.current.setValue('a', 1))
    expect(result.current.derivedValue('ratio').value).toBe(Infinity)
    expect(result.current.derivedValue('ratio').isComputable).toBe(false)
  })

  it('carries exactly the two attributes §8.2 requires, and no tabIndex', () => {
    const { result } = renderPlanForm()
    const total = result.current.derivedValue('planTotal')
    expect(total.props).toEqual({ 'aria-readonly': true, 'aria-live': 'polite' })
    // Not focusable, not in the tab order — so there is nothing to spread that
    // could put it there. `tabIndex={-1}` would still be click-focusable.
    expect(Object.keys(total.props)).toEqual(['aria-readonly', 'aria-live'])
    expect(total).not.toHaveProperty('setValue')
    expect(total).not.toHaveProperty('controlProps')
  })

  it('is not sent to the server — onSubmit receives the inputs only', async () => {
    const onSubmit = vi.fn(async (_values: PlanValues) => {})
    const { result } = renderPlanForm(onSubmit)
    act(() => result.current.setValue('pricePerMinute', 240))
    await act(async () => {
      await result.current.submit()
    })
    // §8.2: "Derived values MUST NOT be persisted."
    expect(onSubmit).toHaveBeenCalledWith({ ...SAVED, pricePerMinute: 240 })
    expect(onSubmit.mock.calls[0]?.[0]).not.toHaveProperty('planTotal')
  })

  it('a form with no derive has no derived values at all', () => {
    const { result } = renderHook(() => useForm({ initialValues: { name: '' }, onSubmit: async () => {} }))
    expect(result.current.derived).toEqual({})
  })
})

/* ─────────────────────────── The Arabic / RTL path ─────────────────────────── */

describe('Arabic and RTL', () => {
  const AR: PlanValues = { ...SAVED, name: 'أسبوعي — شمال الرياض' }

  it('tracks dirty over Arabic text exactly, with no normalisation', () => {
    const { result } = renderHook(() =>
      useForm({ initialValues: AR, derive: derivePlan, validate: validatePlan, onSubmit: async () => {} }),
    )
    expect(result.current.status).toBe('clean')

    act(() => result.current.setValue('name', 'أسبوعي — جدة'))
    expect(result.current.status).toBe('dirty')

    act(() => result.current.setValue('name', AR.name))
    expect(result.current.status).toBe('clean')
  })

  it('treats an invisible RLM as a real change, because it is one', () => {
    const RLM = String.fromCharCode(0x200f)
    const { result } = renderHook(() => useForm({ initialValues: AR, onSubmit: async () => {} }))
    act(() => result.current.setValue('name', RLM + AR.name))
    expect(result.current.isDirty).toBe(true)
  })

  it('gives the same derived result for an Arabic-typed number as for a Latin one', () => {
    const arabicTwelve = String.fromCharCode(0x0661, 0x0662) // ١٢
    const { result } = renderPlanForm()

    act(() => result.current.setValue('pricePerMinute', parseNumericInput(arabicTwelve)))
    const fromArabic = result.current.derived.grossPerTrip

    act(() => result.current.setValue('pricePerMinute', parseNumericInput('12')))
    expect(result.current.derived.grossPerTrip).toBe(fromArabic)
    expect(fromArabic).toBe(240)
  })

  it('clears a field typed as blank to null, not to zero (§8.2.5)', () => {
    const { result } = renderPlanForm()
    act(() => result.current.setValue('discountPercent', parseNumericInput('')))
    expect(result.current.values.discountPercent).toBeNull()
    // ...and the derived value goes to "no computable result", not to full price.
    expect(result.current.derivedValue('planTotal').isComputable).toBe(false)
  })

  it('passes an Arabic error message through untouched', async () => {
    const { result } = renderHook(() =>
      useForm({
        initialValues: { name: '' },
        validate: (values) => (values.name === '' ? { name: 'أدخل اسم الخطة.' } : {}),
        onSubmit: async () => {},
      }),
    )
    act(() => result.current.field('name').onBlur())
    expect(result.current.field('name').error).toBe('أدخل اسم الخطة.')
  })
})

/* ─────────────────────────────── Housekeeping ──────────────────────────────── */

describe('the small things that bite', () => {
  it('setValues with an empty patch changes nothing', () => {
    const { result } = renderPlanForm()
    const before = result.current.values
    act(() => result.current.setValues({}))
    expect(result.current.values).toBe(before)
    expect(result.current.status).toBe('clean')
  })

  it('generates distinct ids for two forms on one page', () => {
    const { result: a } = renderHook(() => useForm({ initialValues: { name: '' }, onSubmit: async () => {} }))
    const { result: b } = renderHook(() => useForm({ initialValues: { name: '' }, onSubmit: async () => {} }))
    expect(a.current.field('name').controlProps.id).not.toBe(b.current.field('name').controlProps.id)
  })

  it('submits a form with no validate at all', async () => {
    const onSubmit = vi.fn(async () => {})
    const { result } = renderHook(() => useForm({ initialValues: { name: 'a' }, onSubmit }))
    act(() => result.current.setValue('name', 'b'))
    expect(result.current.isValid).toBe(true)
    await act(async () => {
      await result.current.submit()
    })
    expect(onSubmit).toHaveBeenCalledWith({ name: 'b' })
    expect(result.current.status).toBe('clean')
  })

  it('does not set state after unmount', async () => {
    let release: () => void = () => {}
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve
        }),
    )
    const { result, unmount } = renderPlanForm(onSubmit)
    act(() => result.current.setValue('name', 'X'))
    act(() => void result.current.submit())
    await waitFor(() => expect(result.current.isSaving).toBe(true))

    const errors: unknown[] = []
    const spy = vi.spyOn(console, 'error').mockImplementation((...args) => errors.push(args))
    unmount()
    await act(async () => {
      release()
    })
    spy.mockRestore()
    expect(errors).toEqual([])
  })
})
