/**
 * Structural equality for **form values**, and only for form values.
 *
 * `DESIGN.md` §8.2.5 defines dirty as *"an editable field differs from its
 * persisted value"*. That definition is only as good as the comparison behind
 * it, and reference equality is not good enough: a tag input (§10.2) hands back
 * a new array on every keystroke, so `['riyadh'] !== ['riyadh']` would leave the
 * save bar armed over a form that is byte-identical to what is stored. The
 * operator then discards changes they never made, or saves a no-op.
 *
 * One call site — `useForm` — plus a rule that has to be enforced centrally.
 * That is the whole justification; it is not a general-purpose `isEqual`.
 *
 * **Scope, deliberately narrow.** Primitives, `Date`, arrays and plain objects.
 * A `Map`, a `Set`, a class instance, a DOM node or a React element compares by
 * reference and will read as "changed". None of those belong in form values —
 * they do not survive a round trip through the API seam either.
 *
 * Two numeric departures from `===`, both intentional:
 * - `NaN` equals `NaN`. Otherwise a field holding `NaN` is permanently dirty and
 *   the save bar can never be dismissed.
 * - `-0` equals `0`. `Object.is` separates them; §8.3.1 does not — `formatMoney`
 *   renders both as `0.00 SAR`, so a form cannot be dirty over a difference no
 *   operator can see.
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false
  const prototype: unknown = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

export function isDeepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true

  if (typeof a === 'number' && typeof b === 'number') {
    // `a === b` above already covered the equal case, including 0 / -0.
    return Number.isNaN(a) && Number.isNaN(b)
  }

  if (a instanceof Date && b instanceof Date) {
    const at = a.getTime()
    const bt = b.getTime()
    // Two `Invalid Date`s are the same non-value. Comparing the raw `NaN`s would
    // make a date field with an unparseable value permanently dirty.
    return at === bt || (Number.isNaN(at) && Number.isNaN(bt))
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i += 1) {
      if (!isDeepEqual(a[i], b[i])) return false
    }
    return true
  }

  if (isPlainObject(a) && isPlainObject(b)) {
    const aKeys = Object.keys(a)
    const bKeys = Object.keys(b)
    if (aKeys.length !== bKeys.length) return false
    for (const key of aKeys) {
      // `key in b` matters: `{ a: undefined }` and `{}` are not the same payload.
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false
      if (!isDeepEqual(a[key], b[key])) return false
    }
    return true
  }

  return false
}
