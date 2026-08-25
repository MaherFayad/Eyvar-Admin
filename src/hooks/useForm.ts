/**
 * Form state for a sectioned form with a contextual save bar.
 *
 * **Why this exists.** No form library is installed and none is going to be:
 * shadcn 4's `form` turned out to be an empty alias that resolves to `field`, so
 * the state layer is ours. Two patterns need it and neither can be built
 * without it — **P3** (the settings form: Admin's six configuration sub-tabs and
 * Financials › Ledger & Payment Controls) and **P4** (the resource editor: the
 * plan editor and every create/edit surface). Design spec `00-shell.md` §10 is
 * the geometry; this is the state behind it.
 *
 * **Legacy defect D2** is the reason dirty tracking is the centre of the hook
 * rather than a convenience on the side: *"No contextual save bar, and no wired
 * dirty indicator. `.form-footer` exists but is used once in the entire file;
 * the other 40 pages and all 21 settings panes have no save chrome.
 * `.settings-dirty-dot` is defined but dead"* (`DESIGN.md` §3262, CSS at
 * `eyvar_ops_panel_v40_fixed.html:248`). The dot at `:248` even ships
 * `display:none`. A save bar cannot be built on top of nothing, so the thing to
 * write first is the "nothing".
 *
 * ## The four rules this hook encodes
 *
 * 1. **The save bar appears when the form is dirty and only then** (§2.3,
 *    design spec §4.1). `status === 'clean'` is the one condition for hiding it,
 *    and `status` is a single string with five values that map 1:1 onto design
 *    spec §11.6 rows 5–9. There is no second way to ask.
 *
 * 2. **A recompute is not an edit** (`DESIGN.md` §8.2.5: *"A recompute MUST NOT
 *    set the dirty state and MUST NOT arm the save bar. Dirty means an editable
 *    field differs from its persisted value."*). Derived values are never stored
 *    in `values`; they are computed from it. Dirtiness is `values` vs the
 *    baseline. A recompute therefore *cannot* arm the save bar — not "does not",
 *    cannot.
 *
 * 3. **A derived value is structurally not a field.** `field(name)` accepts only
 *    `keyof Values`, `derivedValue(name)` accepts only `keyof Derived`, and the
 *    two key sets are asserted disjoint at compile time. A `DerivedValue` has no
 *    `setValue`, no `onBlur` and no control id, so it cannot be bound to an
 *    input even by accident — the same idea as `useIndexTable`'s ledger mode,
 *    which cannot express a checkbox. See `useForm.types.ts`.
 *
 * 4. **A derived value is never independently validated** (§8.2). `FormErrors`
 *    is keyed by `keyof Values`, so `setFieldError('planTotal', …)` on a derived
 *    key is a compile error. §8.2's *"a result outside its legal range raises the
 *    error on the input(s) that produced it"* is the only expressible option.
 *
 * ## What is deliberately left to the caller
 *
 * - **Validation itself.** `validate` is one function returning a map of
 *   messages. There is no schema, no rule DSL, no `required: true`. A DSL would
 *   have to encode copy, and copy is `copy.md`'s and product-designer's; a rule
 *   like "a discount is between 0 and 100" is domain logic and belongs with the
 *   feature (team brief, "what does not belong here").
 * - **Error copy.** Messages are finished, translated strings. The hook never
 *   builds one.
 * - **Announcing.** Design spec §11.6 row 7 says the live region announces
 *   `Saving`. That string is copy; call `useAnnounce()` with it.
 * - **The navigate-away guard** (row 10 / **AC-54**). `isDirty` is what a router
 *   blocker reads; the router seam is frontend-engineer's.
 * - **Sections.** P3 is a *sectioned* form, but a section is layout. Modelling
 *   it here would put render structure in a state hook for no behaviour.
 */

import { useCallback, useId, useMemo, useRef, useState } from 'react'
import { isApiError } from '@/data/types/common'
import { isDeepEqual } from '@/lib/equality'

/* ─────────────────────────── Vocabulary ─────────────────────────── */

/**
 * `object`, not `Record<string, unknown>`. An `interface PlanValues { … }` has no
 * implicit index signature and is therefore **not** assignable to
 * `Record<string, unknown>` — and an interface is what every caller will write.
 * Constraining to `object` keeps `keyof Values` exact, which is what all four
 * rules above are built on.
 */
export type FormValues = object
export type DerivedValues = object

/** Indexing a generic `object` by a string key. Internal; never crosses the API. */
function asRecord(value: object): Record<string, unknown> {
  return value as Record<string, unknown>
}

/**
 * The compile-time disjointness assertion behind rule 3.
 *
 * Every key of `Values` is mapped to optional `never`, so a `Derived` type that
 * declares one of them fails the constraint: `number` is not assignable to
 * `never`. A derived value that is also an editable field is the one shape this
 * hook must never allow, because it is the shape in which a recompute *can* arm
 * the save bar.
 */
export type DisjointFrom<Values> = { [K in keyof Values]?: never }

/** Field-level messages, keyed by editable field. Derived keys cannot appear. */
export type FormErrors<Values> = { readonly [K in keyof Values]?: string }

/** One blocking item, for the page-level critical banner (§10.4, design spec §11.6 row 8). */
export interface FormIssue<Values> {
  field: keyof Values & string
  message: string
}

/**
 * The save bar's state, and nothing else's. Five values, mapping onto design
 * spec §11.6 rows 5–9 in order:
 *
 * | `status`          | row | save bar |
 * |---|---|---|
 * | `clean`           | —   | **not rendered**; the top bar is the top bar |
 * | `dirty`           | 5   | `Discard` + `Save` |
 * | `dirty-invalid`   | 6   | `Save` greyed, `Discard` enabled (**AC-52**) |
 * | `save-in-flight`  | 7   | `Save` shows progress, not re-triggerable; `Discard` disabled |
 * | `save-failed`     | 8/9 | bar stays up, page-level critical banner — read `failure` for which |
 */
export type FormStatus = 'clean' | 'dirty' | 'dirty-invalid' | 'save-in-flight' | 'save-failed'

/**
 * Why the last save did not happen. A discriminated union because the two cases
 * are two different banners with two different bodies (§11.6 rows 8 and 9), and
 * a `boolean` would let a screen render the wrong one.
 */
export type SaveFailure<Values> =
  | { kind: 'validation'; issues: readonly FormIssue<Values>[] }
  | { kind: 'rejected'; error: Error }

/* ──────────────────────────── Bindings ──────────────────────────── */

/**
 * The attributes only the form state can get right. `aria-describedby` points at
 * the error message when there is one — §10.4 requires three simultaneous
 * signals and *"never colour alone"*, and an unassociated message is colour
 * alone to a screen reader.
 *
 * A field with helper text as well as an error must join the two ids itself:
 * only the component knows whether helper text was rendered. Spread
 * `controlProps` first, then override.
 */
export interface FieldControlProps {
  id: string
  name: string
  /** `true` or absent. Never `false` — `aria-invalid="false"` is noise on 225 inputs. */
  'aria-invalid': true | undefined
  'aria-describedby': string | undefined
}

export interface Field<V> {
  name: string
  value: V
  /** Value-level, not event-level. A `select`, a `Checkbox` and a tag input do not share an event type. */
  setValue: (next: V) => void
  /** Marks the field touched. Until then its message is computed but not shown. */
  onBlur: () => void
  /** The message to render below the control, or `null`. Already filtered for visibility. */
  error: string | null
  isDirty: boolean
  isTouched: boolean
  labelId: string
  errorId: string
  controlProps: FieldControlProps
}

/**
 * §8.2, as attributes: *"A derived value MUST NOT be focusable, MUST NOT appear
 * in the tab order, and MUST carry `aria-readonly="true"` plus
 * `aria-live="polite"`."*
 *
 * There is deliberately **no `tabIndex`**, not even `-1`. `tabIndex={-1}` still
 * makes an element focusable by script and by click, and §8.2 says not
 * focusable. Spread these onto a `span`, never onto an `input`.
 */
export interface DerivedValueProps {
  'aria-readonly': true
  'aria-live': 'polite'
}

export interface DerivedValue<V> {
  name: string
  value: V
  /**
   * `false` for `null`, `undefined`, `NaN` and `Infinity`. §8.2: *"A derived
   * value with no computable result MUST render an em-dash, never `0`, never
   * blank, never a spinner."* Render `ABSENT` from `@/lib` when this is `false`.
   */
  isComputable: boolean
  props: DerivedValueProps
}

/* ───────────────────────────── Options ──────────────────────────── */

export interface UseFormOptions<Values extends FormValues, Derived extends DerivedValues> {
  /** The persisted record, as form values. Also the first baseline: the form starts `clean`. */
  initialValues: Values
  /**
   * Pure, synchronous, and the only place derived values come from.
   *
   * Synchronous is a contract, not a limitation. §8.2 allows 150 ms before a
   * derived value must be replaced by an em-dash; a value that needs longer than
   * that is not derived, it is data, and it belongs in `useAsync`. Keeping this
   * synchronous is also what makes rule 2 structural.
   *
   * Wrap it in `useCallback` or define it at module scope if you want the memo
   * to hold; an unstable identity recomputes every render, which is correct but
   * pointless.
   */
  derive?: (values: Values) => Derived
  /**
   * Everything wrong with the form right now, as finished messages. Called with
   * the derived values too, because §8.2's rule is that a bad *result* raises
   * its error on the *inputs* — which needs the result in hand.
   */
  validate?: (values: Values, derived: Derived) => FormErrors<Values>
  /**
   * Transport-agnostic, like `useAsync`: it takes values and returns a promise.
   * It must throw on failure — an `ApiError` with `kind: 'validation'` and
   * `details[].field` is mapped onto field errors automatically.
   *
   * Return the server's canonical values to adopt them as the new baseline
   * (a trimmed name, a server-assigned id). Return nothing to keep what was
   * submitted.
   */
  onSubmit: (values: Values) => Promise<Values | void>
  /** Id prefix for the generated control/label/error ids. Defaults to a `useId()` value. */
  id?: string
}

/* ────────────────────────────── Result ─────────────────────────────── */

export interface Form<Values extends FormValues, Derived extends DerivedValues> {
  values: Values
  /** Recomputed from `values`. Never persisted (§8.2), never part of dirtiness. */
  derived: Derived
  status: FormStatus
  /** `values` differs from the last saved baseline. The save bar's one visibility condition. */
  isDirty: boolean
  /** No blocking message anywhere, whether or not it is being shown yet. */
  isValid: boolean
  isSaving: boolean
  /** `Save` is enabled: dirty **and** valid **and** not already saving (§2903, **AC-52**). */
  canSave: boolean
  /** `Discard` is enabled: dirty and not saving. Never gated on validity — **AC-52**. */
  canDiscard: boolean
  dirtyFields: readonly (keyof Values & string)[]
  /** Visible field errors only: touched, or everything once a save has been attempted. */
  errors: FormErrors<Values>
  /** Every blocking message, in field declaration order, whether visible or not. */
  issues: readonly FormIssue<Values>[]
  failure: SaveFailure<Values> | null
  field: <K extends keyof Values & string>(name: K) => Field<Values[K]>
  derivedValue: <K extends keyof Derived & string>(name: K) => DerivedValue<Derived[K]>
  setValue: <K extends keyof Values & string>(name: K, next: Values[K]) => void
  setValues: (patch: Partial<Values>) => void
  /** For a message only the caller can know — a server rule, a cross-field conflict. `null` clears. */
  setFieldError: <K extends keyof Values & string>(name: K, message: string | null) => void
  /** Runs validation, then `onSubmit`. Refuses to run twice; §4.1's *"not re-triggerable"*. */
  submit: () => Promise<void>
  /** The save bar's `Discard`: back to the last saved values, errors and touch state cleared. */
  discard: () => void
  /** Adopt a new saved baseline — the record arrived, or was saved elsewhere. Clears everything. */
  reset: (next: Values) => void
}

/* ─────────────────────────── Implementation ─────────────────────── */

/** Internal shape for a message map. Optional-valued, so a mapped `FormErrors` fits without a lossy cast. */
type ErrorMap = Readonly<Record<string, string | undefined>>
type MutableErrorMap = Record<string, string | undefined>

const EMPTY_ERRORS: ErrorMap = Object.freeze({})
const EMPTY_TOUCHED: ReadonlySet<string> = new Set<string>()

function toError(thrown: unknown): Error {
  if (thrown instanceof Error) return thrown
  return new Error(typeof thrown === 'string' ? thrown : 'Something went wrong.')
}

/** `null`, `undefined`, `NaN` and `Infinity` are all "no computable result" (§8.2). */
function isComputable(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'number') return Number.isFinite(value)
  return true
}

/**
 * An `ApiError` carrying `kind: 'validation'` maps onto field errors — but only
 * for fields this form actually has. A detail naming something else is not a
 * field problem for *this* form and must fall through to the `rejected` banner
 * (§11.6 row 9) rather than vanish.
 */
function fieldErrorsFromRejection(thrown: unknown, keys: ReadonlySet<string>): ErrorMap {
  if (!isApiError(thrown)) return {}
  const mapped: MutableErrorMap = {}
  for (const detail of thrown.details) {
    const [head] = detail.field.split('.')
    if (head !== undefined && keys.has(head)) mapped[head] = detail.message
  }
  return mapped
}

export function useForm<
  Values extends FormValues,
  Derived extends DerivedValues & DisjointFrom<Values> = Record<never, never>,
>(options: UseFormOptions<Values, Derived>): Form<Values, Derived> {
  const { initialValues, derive, validate, onSubmit, id } = options

  const reactId = useId()
  const formId = id ?? reactId

  const [values, setValuesState] = useState<Values>(initialValues)
  const [baseline, setBaseline] = useState<Values>(initialValues)
  const [touched, setTouched] = useState<ReadonlySet<string>>(EMPTY_TOUCHED)
  /** Field errors that came back from a save, not from `validate`. Cleared per field on edit. */
  const [submitErrors, setSubmitErrors] = useState<ErrorMap>(EMPTY_ERRORS)
  /** A failure that is not about any one field. Design spec §11.6 row 9. */
  const [rejection, setRejection] = useState<Error | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  /** Once true, every message is visible and the page-level banner is armed. */
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const onSubmitRef = useRef(onSubmit)
  onSubmitRef.current = onSubmit
  const validateRef = useRef(validate)
  validateRef.current = validate
  const deriveRef = useRef(derive)
  deriveRef.current = derive
  /** Latest-wins, and a guard against setting state after unmount. */
  const submitIdRef = useRef(0)

  const derived = useMemo<Derived>(
    () => (derive ? derive(values) : ({} as Derived)),
    // `derive` is in the list so a caller who stabilises it gets a real memo.
    [derive, values],
  )

  const validationErrors = useMemo<ErrorMap>(() => {
    if (!validate) return EMPTY_ERRORS
    return validate(values, derived) as ErrorMap
  }, [validate, values, derived])

  /**
   * A live validation message is more current than one a save returned, so it
   * wins — but a save error survives until the field it names is edited, which
   * is what makes "the submit failed, now fix it" legible.
   */
  const allErrors = useMemo<ErrorMap>(
    () => ({ ...submitErrors, ...validationErrors }),
    [submitErrors, validationErrors],
  )

  const issues = useMemo<readonly FormIssue<Values>[]>(() => {
    // Declaration order, so the banner lists blocking items in the order the
    // operator reads the form — not in hash order, and not in error order.
    const out: FormIssue<Values>[] = []
    for (const key of Object.keys(values)) {
      const message = allErrors[key]
      if (message !== undefined && message !== '') {
        out.push({ field: key as keyof Values & string, message })
      }
    }
    return out
  }, [values, allErrors])

  const isValid = issues.length === 0

  const dirtyFields = useMemo<readonly (keyof Values & string)[]>(() => {
    const current = asRecord(values)
    const saved = asRecord(baseline)
    const keys = new Set([...Object.keys(saved), ...Object.keys(current)])
    const out: (keyof Values & string)[] = []
    for (const key of keys) {
      if (!isDeepEqual(current[key], saved[key])) out.push(key as keyof Values & string)
    }
    return out
  }, [values, baseline])

  const isDirty = dirtyFields.length > 0

  const errors = useMemo<FormErrors<Values>>(() => {
    const visible: MutableErrorMap = {}
    for (const [key, message] of Object.entries(allErrors)) {
      if (submitAttempted || touched.has(key)) visible[key] = message
    }
    return visible as FormErrors<Values>
  }, [allErrors, submitAttempted, touched])

  const failure = useMemo<SaveFailure<Values> | null>(() => {
    if (rejection !== null) return { kind: 'rejected', error: rejection }
    // Recomputed live rather than snapshotted: as the operator fixes fields the
    // banner's count comes down, which is the whole point of stating a count.
    if (submitAttempted && issues.length > 0) return { kind: 'validation', issues }
    return null
  }, [rejection, submitAttempted, issues])

  const status: FormStatus = isSaving
    ? 'save-in-flight'
    : !isDirty
      ? 'clean'
      : failure !== null
        ? 'save-failed'
        : isValid
          ? 'dirty'
          : 'dirty-invalid'

  const clearFieldFailure = useCallback((keys: readonly string[]) => {
    setSubmitErrors((current) => {
      if (!keys.some((key) => key in current)) return current
      const next = { ...current }
      for (const key of keys) delete next[key]
      return next
    })
    // A rejection is about the payload that was sent. The operator just changed
    // it, so the message no longer describes anything on screen.
    setRejection(null)
  }, [])

  const setValues = useCallback(
    (patch: Partial<Values>) => {
      const keys = Object.keys(patch)
      if (keys.length === 0) return
      setValuesState((current) => ({ ...current, ...patch }))
      clearFieldFailure(keys)
    },
    [clearFieldFailure],
  )

  const setValue = useCallback(
    <K extends keyof Values & string>(name: K, next: Values[K]) => {
      setValuesState((current) => ({ ...current, [name]: next }))
      clearFieldFailure([name])
    },
    [clearFieldFailure],
  )

  const setFieldError = useCallback(<K extends keyof Values & string>(name: K, message: string | null) => {
    setSubmitErrors((current) => {
      if (message === null) {
        if (!(name in current)) return current
        const next = { ...current }
        delete next[name]
        return next
      }
      if (current[name] === message) return current
      return { ...current, [name]: message }
    })
  }, [])

  const markTouched = useCallback((name: string) => {
    setTouched((current) => {
      if (current.has(name)) return current
      const next = new Set(current)
      next.add(name)
      return next
    })
  }, [])

  const field = useCallback(
    <K extends keyof Values & string>(name: K): Field<Values[K]> => {
      const message = submitAttempted || touched.has(name) ? (allErrors[name] ?? null) : null
      const errorId = `${formId}-${name}-error`
      return {
        name,
        value: values[name] as Values[K],
        setValue: (next: Values[K]) => setValue(name, next),
        onBlur: () => markTouched(name),
        error: message,
        isDirty: !isDeepEqual(values[name], baseline[name]),
        isTouched: touched.has(name),
        labelId: `${formId}-${name}-label`,
        errorId,
        controlProps: {
          id: `${formId}-${name}`,
          name,
          'aria-invalid': message !== null ? true : undefined,
          'aria-describedby': message !== null ? errorId : undefined,
        },
      }
    },
    [values, baseline, touched, allErrors, submitAttempted, formId, setValue, markTouched],
  )

  const derivedValue = useCallback(
    <K extends keyof Derived & string>(name: K): DerivedValue<Derived[K]> => {
      const value = derived[name] as Derived[K]
      return {
        name,
        value,
        isComputable: isComputable(value),
        props: { 'aria-readonly': true, 'aria-live': 'polite' },
      }
    },
    [derived],
  )

  const discard = useCallback(() => {
    setValuesState(baseline)
    setTouched(EMPTY_TOUCHED)
    setSubmitErrors(EMPTY_ERRORS)
    setRejection(null)
    setSubmitAttempted(false)
  }, [baseline])

  const reset = useCallback((next: Values) => {
    // Invalidate any save still in flight: its result describes a record the
    // caller has just replaced.
    submitIdRef.current += 1
    setValuesState(next)
    setBaseline(next)
    setTouched(EMPTY_TOUCHED)
    setSubmitErrors(EMPTY_ERRORS)
    setRejection(null)
    setSubmitAttempted(false)
    setIsSaving(false)
  }, [])

  const submit = useCallback(async (): Promise<void> => {
    // §4.1: while saving, `Save` "is not re-triggerable". Enforced here as well
    // as in the disabled button, because Enter in a text field also submits.
    if (isSaving) return

    setSubmitAttempted(true)

    const currentValidate = validateRef.current
    const currentDerive = deriveRef.current
    const nextDerived = currentDerive ? currentDerive(values) : ({} as Derived)
    const nextErrors = currentValidate
      ? (currentValidate(values, nextDerived) as ErrorMap)
      : EMPTY_ERRORS
    const blocking = Object.keys(values).some((key) => {
      const message = nextErrors[key] ?? submitErrors[key]
      return message !== undefined && message !== ''
    })
    if (blocking) {
      // Nothing is sent. `submitAttempted` has armed the banner and made every
      // message visible; `failure` recomputes to `kind: 'validation'`.
      return
    }

    const submitId = ++submitIdRef.current
    setRejection(null)
    setIsSaving(true)

    try {
      const returned = await onSubmitRef.current(values)
      if (submitId !== submitIdRef.current) return
      const saved = (returned ?? values) as Values
      setValuesState(saved)
      setBaseline(saved)
      setTouched(EMPTY_TOUCHED)
      setSubmitErrors(EMPTY_ERRORS)
      setRejection(null)
      setSubmitAttempted(false)
    } catch (thrown: unknown) {
      if (submitId !== submitIdRef.current) return
      const mapped = fieldErrorsFromRejection(thrown, new Set(Object.keys(values)))
      if (Object.keys(mapped).length > 0) {
        setSubmitErrors(mapped)
        setRejection(null)
      } else {
        setRejection(toError(thrown))
      }
    } finally {
      if (submitId === submitIdRef.current) setIsSaving(false)
    }
  }, [isSaving, values, submitErrors])

  return {
    values,
    derived,
    status,
    isDirty,
    isValid,
    isSaving,
    canSave: isDirty && isValid && !isSaving,
    canDiscard: isDirty && !isSaving,
    dirtyFields,
    errors,
    issues,
    failure,
    field,
    derivedValue,
    setValue,
    setValues,
    setFieldError,
    submit,
    discard,
    reset,
  }
}
