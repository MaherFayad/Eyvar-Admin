/**
 * Compile-time assertions for the derived-value rules in `DESIGN.md` §8.2 and
 * design spec `00-shell.md` §10.3. This file runs nothing; it fails
 * `npx tsc -b --noEmit` if any of the constructions below start compiling.
 *
 * Same device as `useIndexTable.types.ts`: `@ts-expect-error` is itself an error
 * when the line it marks has **no** error. So if someone "helpfully" relaxes the
 * `Derived` constraint or adds a `setValue` to `DerivedValue`, the build breaks
 * here and names the rule — rather than an operator discovering, in Phase 1,
 * that a plan total is an editable field.
 *
 * The brief's test is *"if a caller can accidentally bind an input to a derived
 * field, the type is too weak"*. That is not a claim a runtime test can make.
 */

import { useForm } from './useForm'

interface PlanValues {
  name: string
  pricePerMinute: number | null
  discountPercent: number | null
  eyvarPercent: number | null
}

const initialValues: PlanValues = {
  name: '',
  pricePerMinute: null,
  discountPercent: null,
  eyvarPercent: null,
}

/**
 * The plan editor, as §8.2 describes it: four typed inputs, three values nobody
 * types into. `driverShare` is legacy `#fp3-ds` (`:12988`); `planTotal` and
 * `grossPerTrip` are `cr()` (`:12986`).
 */
function planForm() {
  return useForm({
    initialValues,
    derive: (values) => ({
      grossPerTrip: values.pricePerMinute === null ? null : values.pricePerMinute * 20,
      planTotal: values.discountPercent === null ? null : 100 - values.discountPercent,
      driverShare: values.eyvarPercent === null ? null : 100 - values.eyvarPercent,
    }),
    onSubmit: async () => {},
  })
}

/* §8.2: "Nobody types here, ever." */
export function aDerivedValueIsStructurallyNotAField(): void {
  const form = planForm()

  // @ts-expect-error a derived value is not a field and has no binding
  void form.field('planTotal')
  // @ts-expect-error a derived value cannot be written
  void form.setValue('planTotal', 42)
  // @ts-expect-error a derived value cannot be written in bulk either
  void form.setValues({ planTotal: 42 })

  // §8.2: "A derived value MUST NOT be independently validated."
  // @ts-expect-error the error goes on the input that produced the result
  void form.setFieldError('planTotal', 'Enter a discount between 0 and 100.')

  // ...and the reverse: an editable field is not a derived value.
  // @ts-expect-error an editable field is not read through derivedValue
  void form.derivedValue('discountPercent')

  // The accessor that does exist gives no way to write.
  const total = form.derivedValue('planTotal')
  // @ts-expect-error a DerivedValue has no setter
  void total.setValue
  // @ts-expect-error a DerivedValue has no blur handler, because it takes no focus
  void total.onBlur
  // @ts-expect-error a DerivedValue has no control id, because there is no control
  void total.controlProps
  // §8.2: "MUST NOT be focusable, MUST NOT appear in the tab order."
  // @ts-expect-error there is no tabIndex to set, not even -1
  void total.props.tabIndex

  // The two attributes §8.2 does require are literal types, not `boolean`/`string`,
  // so no branch can turn them off and a reviewer can see the rule in the type.
  const readOnly: true = total.props['aria-readonly']
  const live: 'polite' = total.props['aria-live']
  void readOnly
  void live
}

/* A key cannot be editable and derived at once — that is the shape in which a
   recompute could arm the save bar (§8.2.5). */
export function aKeyCannotBeBothEditableAndDerived(): void {
  useForm({
    initialValues,
    // @ts-expect-error `name` is an editable field; a derive may not also produce it
    derive: (values: PlanValues) => ({ name: values.name.trim() }),
    onSubmit: async () => {},
  })
}

/* With no `derive`, there is nothing to read. */
export function noDeriveMeansNoDerivedValues(): void {
  const form = useForm({ initialValues, onSubmit: async () => {} })
  // @ts-expect-error this form declares no derived values
  void form.derivedValue('planTotal')
}

/* `validate` is keyed by editable field for the same reason. */
export function validateCannotAddressADerivedValue(): void {
  useForm({
    initialValues,
    derive: (values) => ({ planTotal: values.discountPercent }),
    // @ts-expect-error a derived value is never independently validated (§8.2)
    validate: () => ({ planTotal: 'Out of range.' }),
    onSubmit: async () => {},
  })
}

/* And an unknown key is a typo, not a new field. */
export function anUnknownKeyIsATypo(): void {
  const form = planForm()
  // @ts-expect-error there is no such field
  void form.field('discountPct')
  // @ts-expect-error a field keeps its declared type
  void form.setValue('name', 42)
}
