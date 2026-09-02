/**
 * Field — **the one field shape.** Doc 13 Phase 6.1 option (b), doc 14 G7.
 *
 * ## What this file replaced, and the finding behind it
 *
 * The shadcn `field` registry item shipped here in 0.4 and acquired **zero
 * consumers**. Twenty screens hand-rolled `<Label htmlFor> + <Input> + <span
 * className="text-2xs text-destructive">`, and auth built a parallel
 * `AuthFieldError`. So the product had three answers to "how does a field
 * render its error" and §10.4 was enforced by nobody.
 *
 * `AuthFields.tsx` justified its duplicate with two claims. Verified against
 * the tree before acting on them:
 *
 *   1. *"`ui/field.tsx`'s `FieldError` renders 13 px with no glyph."* — the
 *      glyph half is right; the number is stale. The old `FieldError` was
 *      `text-sm`, which is **14 px** in Latin and 14 px in Arabic
 *      (`globals.css:1129`, `:1513`), not 13. Either way it is one step above
 *      §10.4's 12 px and it carried colour + words but no non-colour mark.
 *   2. *"three other screens are being built against `FieldError` right now
 *      and changing its size under them would be a regression."* — **false.**
 *      `grep -rn 'ui/field' src/` returned exactly one hit and it was that
 *      comment. There were no consumers to regress.
 *
 * So the duplication's stated reason never existed, the surviving treatment is
 * auth's (12 px + filled circle-exclamation, written against §10.4), and
 * `AuthFieldError` is **deleted** rather than preserved. Its API does not
 * survive either: it took an `id` from its call site, and a `Field` that hands
 * out its own ids makes that prop redundant.
 *
 * ## The anatomy, in DOM order
 *
 *   FieldLabel        14px/400 `--ev-ink`, above the control, sentence case.
 *                     `(optional)` is a SUFFIX; there are NO ASTERISKS in this
 *                     product, so a required field carries no marker and an
 *                     optional one says so in words (§10.2, `label.tsx`).
 *   FieldControl      the control itself. Wraps a single element and injects
 *                     `id`, `aria-describedby`, `aria-invalid` and `disabled`
 *                     so no call site wires them by hand — the plumbing was
 *                     what the twenty hand-rolled forms got wrong.
 *   FieldDescription  12px `--ev-text-2`, BELOW the control. Constraints and
 *                     consequences live here, never in a tooltip (§5.7 r7).
 *   FieldError        12px `--ev-red` + filled circle-exclamation, `role=alert`.
 *
 * ## Vertical rhythm — every value on the 4px grid (D-2 licences smaller, not
 * off-grid)
 *
 *   label → control            4px    `gap-1` on the field column
 *   control → description      4px    same column gap
 *   description → error        4px    same column gap
 *   field → field              16px   `FieldGroup` `gap-4`
 *   group → group / section    24px   `FieldSet` `gap-6`
 *   settings row → row         16px + a hairline, `FieldRow` inside `FieldRows`
 *
 * One column gap, one group gap. A form that needs a third value is a form
 * that needs a `FieldSet`.
 *
 * ## The four control states, and why read-only is not disabled
 *
 *   default    `bg-card`, `border-input`, value at `--ev-ink`
 *   focus      2px `--ev-ring` at 2px offset; **the fill does not change**
 *   invalid    1px `--ev-red` border AND a 12px message. NEVER colour alone,
 *              and deliberately NO `--ev-red-lt` fill — that plate belongs to
 *              the page-level critical banner §4.4 raises at the same moment,
 *              and painting both would make the summary and the items it
 *              summarises one surface. §6.2 **D-14**, and `input.tsx` says the
 *              same thing at the other end.
 *   read-only  `bg-muted` fill, border kept, **value at full ink**, focusable,
 *              in the AT tree. This is NOT the disabled treatment: disabled
 *              adds `opacity-50` and leaves the tab order. The distinction is
 *              load-bearing — §2.5 and AC-562/563/586 all turn on a frozen
 *              field keeping its value readable, and `AuthTextField` has no
 *              `disabled` prop at all for that reason.
 *   disabled   `bg-muted` + `opacity-50` + not focusable. Means "not yet".
 *              A DERIVED VALUE MUST NOT USE IT (§8.2.1) — a derived value has
 *              no box at all. Use `DerivedValue`.
 *
 * ## Rules applied
 *   §10.2   label above, 13/400-class weight, sentence case; helper text below
 *           the control at 12px `--ev-text-2`; `(optional)` as a suffix.
 *   §10.2   a checkbox's helper text indents to the checkbox's LABEL, not to
 *           its box — `orientation="horizontal"` + `FieldContent` does this.
 *   §10.4   invalid is TWO carriers and one of them is words.
 *   §7.2    every control keeps its focus ring; nothing here sets `outline-none`
 *           without a `focus-visible` replacement.
 *   §7.4    every input has an associated `<label>`; `FieldLabel` gets its
 *           `htmlFor` from context so it cannot drift from the control.
 *   §9.1    logical properties only — `ms-`, `text-start`, `gap`. Nothing here
 *           names a physical side, so the whole vocabulary mirrors for free.
 *   §14     no `text-transform`, no `letter-spacing`, no italic.
 *   AC-75   no concatenation. `(optional)` arrives as a whole localised string.
 *   R6      a field error is a sentence and takes a period; a label does not.
 */
import * as React from "react"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

/* ───────────────────────────────── context ───────────────────────────────── */

interface FieldContextValue {
  /** The control's `id`. `FieldLabel` points at it, the parts derive from it. */
  id: string
  invalid: boolean
  disabled: boolean
  /** Set by `FieldDescription` on mount so `aria-describedby` is exact. */
  registerDescription: (present: boolean) => void
  registerError: (present: boolean) => void
  hasDescription: boolean
  hasError: boolean
}

const FieldContext = React.createContext<FieldContextValue | null>(null)

/**
 * For a control `FieldControl` cannot wrap — a composite built from several
 * elements, or one that needs the ids in a callback. Returns `null` outside a
 * `Field`, so a component may use it defensively without forcing the wrapper.
 */
function useFieldContext(): FieldContextValue | null {
  return React.useContext(FieldContext)
}

/** The `aria-describedby` value for a field, or `undefined` when there is none. */
function describedBy(ctx: FieldContextValue, extra?: string): string | undefined {
  const ids = [
    ctx.hasDescription ? `${ctx.id}-description` : null,
    ctx.hasError ? `${ctx.id}-error` : null,
    extra ?? null,
  ].filter(Boolean)
  return ids.length === 0 ? undefined : ids.join(" ")
}

/* ─────────────────────────────────  Field  ───────────────────────────────── */

export interface FieldProps extends Omit<React.ComponentProps<"div">, "id"> {
  /**
   * `vertical` — label above the control. The default, and what every modal
   * and dialog uses (§10.2).
   *
   * `horizontal` — control first, then a `FieldContent` block carrying the
   * label and its description. This is the checkbox / radio / switch shape,
   * and it is what makes the helper text indent to the LABEL rather than to
   * the box.
   */
  orientation?: "vertical" | "horizontal"
  /** Drives the control's red border and the error's presence. */
  invalid?: boolean
  /** Greys the whole unit. Not the same thing as `readOnly` — see the header. */
  disabled?: boolean
  /** Supply one to keep an id stable across renders in a test or a deep link. */
  id?: string
}

function Field({
  className,
  orientation = "vertical",
  invalid = false,
  disabled = false,
  id,
  ...props
}: FieldProps) {
  const generated = React.useId()
  const [hasDescription, setHasDescription] = React.useState(false)
  const [hasError, setHasError] = React.useState(false)

  const value = React.useMemo<FieldContextValue>(
    () => ({
      id: id ?? generated,
      invalid,
      disabled,
      hasDescription,
      hasError,
      registerDescription: setHasDescription,
      registerError: setHasError,
    }),
    [id, generated, invalid, disabled, hasDescription, hasError]
  )

  return (
    <FieldContext.Provider value={value}>
      <div
        role="group"
        data-slot="field"
        data-orientation={orientation}
        data-invalid={invalid || undefined}
        data-disabled={disabled || undefined}
        className={cn(
          "group/field flex w-full text-start",
          /* 4px between every part of one field. The single intra-field gap. */
          orientation === "vertical" && "flex-col gap-1",
          /* A checkbox row: control, then the label block beside it. 8px is
             the control-to-label gap §4.3 asks for, and `items-start` keeps a
             two-line label from dragging the box down with it. */
          orientation === "horizontal" && "flex-row items-start gap-2",
          disabled && "opacity-50",
          className
        )}
        {...props}
      />
    </FieldContext.Provider>
  )
}

/* ─────────────────────────────  FieldControl  ────────────────────────────── */

/**
 * Injects `id`, `aria-describedby`, `aria-invalid` and `disabled` into the one
 * element it wraps, and renders **no DOM of its own**.
 *
 * ```tsx
 * <FieldControl><Input value={email} onChange={…} /></FieldControl>
 * ```
 *
 * A `Select` works too — wrap the trigger, not the root, so Radix's own
 * context is untouched:
 *
 * ```tsx
 * <Select …>
 *   <FieldControl><SelectTrigger><SelectValue /></SelectTrigger></FieldControl>
 *   <SelectContent>…</SelectContent>
 * </Select>
 * ```
 *
 * The child's own props win, so a call site that genuinely needs its own `id`
 * or an extra `aria-describedby` can still say so.
 */
function FieldControl({ children }: { children: React.ReactElement }) {
  const ctx = useFieldContext()
  if (ctx === null) return children

  const child = children as React.ReactElement<Record<string, unknown>>
  const own = child.props
  const extra = typeof own["aria-describedby"] === "string" ? (own["aria-describedby"] as string) : undefined

  return React.cloneElement(child, {
    id: own.id ?? ctx.id,
    "aria-invalid": own["aria-invalid"] ?? (ctx.invalid || undefined),
    "aria-describedby": describedBy(ctx, extra),
    disabled: own.disabled ?? (ctx.disabled || undefined),
  })
}

/* ──────────────────────────────  FieldLabel  ─────────────────────────────── */

export interface FieldLabelProps extends React.ComponentProps<typeof Label> {
  /**
   * The localised `(optional)` suffix — §10.2's marker, and the only one this
   * product has. **There is no required marker and no asterisk.** Pass
   * `t('field.optional')`; passing nothing means the field is required.
   */
  optional?: React.ReactNode
}

function FieldLabel({ className, optional, children, htmlFor, ...props }: FieldLabelProps) {
  const ctx = useFieldContext()
  return (
    <Label
      data-slot="field-label"
      htmlFor={htmlFor ?? ctx?.id}
      className={cn(
        "group/field-label peer/field-label w-fit gap-1.5 leading-snug",
        className
      )}
      {...props}
    >
      {children}
      {optional ? (
        <span data-slot="field-optional" className="text-xs text-muted-foreground">
          {optional}
        </span>
      ) : null}
    </Label>
  )
}

/**
 * A label-weight heading for a unit that is **not** a single control — the
 * title beside a checkbox in a `horizontal` field, or a `FieldRow`'s leading
 * column. Not a `<label>`: it points at nothing.
 */
function FieldTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-title"
      className={cn("w-fit text-sm leading-snug font-normal text-foreground", className)}
      {...props}
    />
  )
}

/* ───────────────────────────  FieldDescription  ──────────────────────────── */

function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
  const ctx = useFieldContext()
  const register = ctx?.registerDescription
  React.useEffect(() => {
    register?.(true)
    return () => register?.(false)
  }, [register])

  return (
    <p
      data-slot="field-description"
      id={ctx === null ? undefined : `${ctx.id}-description`}
      className={cn(
        "text-start text-xs leading-normal font-normal text-muted-foreground",
        "[&>a]:underline [&>a]:underline-offset-4",
        className
      )}
      {...props}
    />
  )
}

/* ──────────────────────────────  FieldError  ─────────────────────────────── */

/** Filled circle-exclamation, 12px, `currentColor`. A mark: it does not mirror. */
function ErrorGlyph() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="mt-0.5 size-3 shrink-0"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M8 1.5A6.5 6.5 0 1 0 8 14.5 6.5 6.5 0 0 0 8 1.5Zm.75 3.25v4.5h-1.5v-4.5h1.5ZM8 12a.9.9 0 1 1 0-1.8A.9.9 0 0 1 8 12Z" />
    </svg>
  )
}

export interface FieldErrorProps extends React.ComponentProps<"p"> {
  /** Several messages for one control; deduplicated, rendered as a list. */
  errors?: Array<{ message?: string } | undefined>
}

/**
 * **Two carriers, and the second one is words.** 12px `--ev-red` with a filled
 * circle-exclamation, inserted below the field, replacing nothing. The control
 * takes its red border from `aria-invalid`, which `FieldControl` supplies.
 *
 * `--ev-red` on white is 6.574:1, so the border clears the 3:1 non-text floor
 * with room and the message clears 4.5:1. The focus ring is a separate channel,
 * so an invalid focused field composes both without collision.
 *
 * Renders nothing when there is no message — so a call site may mount it
 * unconditionally with `{error}` and never guard.
 */
function FieldError({ className, children, errors, ...props }: FieldErrorProps) {
  const ctx = useFieldContext()

  const content = React.useMemo(() => {
    if (children !== undefined && children !== null && children !== false) return children
    if (!errors?.length) return null
    const unique = [...new Map(errors.map((e) => [e?.message, e])).values()].filter(
      (e): e is { message: string } => typeof e?.message === "string" && e.message !== ""
    )
    if (unique.length === 0) return null
    if (unique.length === 1) return unique[0]?.message ?? null
    return (
      <ul className="flex list-disc flex-col gap-1 ms-4">
        {unique.map((e) => (
          <li key={e.message}>{e.message}</li>
        ))}
      </ul>
    )
  }, [children, errors])

  const present = content !== null
  const register = ctx?.registerError
  React.useEffect(() => {
    register?.(present)
    return () => register?.(false)
  }, [register, present])

  if (!present) return null

  return (
    <p
      role="alert"
      data-slot="field-error"
      id={ctx === null ? undefined : `${ctx.id}-error`}
      className={cn(
        "flex items-start gap-1 text-start text-xs leading-normal font-normal text-destructive",
        className
      )}
      {...props}
    >
      <ErrorGlyph />
      <span>{content}</span>
    </p>
  )
}

/* ───────────────────────────────  grouping  ──────────────────────────────── */

/**
 * The stack. 16px between fields, and it is the only between-field value in
 * the product. Two short related fields sit 50/50 on one row (§10.1) — put
 * them in a `<div className="grid grid-cols-2 gap-3">` inside the group.
 */
function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-group"
      className={cn("flex w-full flex-col gap-4", className)}
      {...props}
    />
  )
}

/**
 * A real `<fieldset>` for a set of controls that answer ONE question — a radio
 * group, a checkbox list. 24px from the set above it, 8px inside.
 */
function FieldSet({ className, ...props }: React.ComponentProps<"fieldset">) {
  return (
    <fieldset
      data-slot="field-set"
      className={cn("flex min-w-0 flex-col gap-2", className)}
      {...props}
    />
  )
}

/** The `<fieldset>`'s question. Same weight as a label; it is one. */
function FieldLegend({ className, ...props }: React.ComponentProps<"legend">) {
  return (
    <legend
      data-slot="field-legend"
      className={cn("text-sm leading-snug font-normal text-foreground", className)}
      {...props}
    />
  )
}

/**
 * The label + description block beside a checkbox, radio or switch in a
 * `horizontal` field. This is what indents the helper text to the LABEL rather
 * than to the box (§10.2).
 */
function FieldContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-content"
      className={cn("flex min-w-0 flex-1 flex-col gap-1 leading-snug", className)}
      {...props}
    />
  )
}

function FieldSeparator({ className, ...props }: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="field-separator"
      className={cn("my-1", className)}
      {...props}
    />
  )
}

/* ─────────────────────  the two-column settings row  ─────────────────────── */

/**
 * A settings pane is not a modal. Doc 13 §6.2 takes the console cohort's
 * two-column row for panes — label and helper on the leading side, control on
 * the trailing side — because a stacked label costs a whole line per field and
 * a pane with fifteen fields becomes unscannable.
 *
 * `FieldRows` is the container; `FieldRow` is one row and composes `Field`, so
 * every part below still works inside it.
 *
 * The leading column is 240px and the row collapses to stacked below the one
 * breakpoint this product has. `@container` is deliberately not used: the pane
 * is always the content region's width.
 */
function FieldRows({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-rows"
      className={cn("flex w-full flex-col divide-y divide-border", className)}
      {...props}
    />
  )
}

function FieldRow({
  className,
  label,
  description,
  optional,
  children,
  ...props
}: FieldProps & {
  label: React.ReactNode
  description?: React.ReactNode
  optional?: React.ReactNode
}) {
  return (
    <Field
      className={cn(
        "grid grid-cols-1 items-start gap-2 py-3 wide:grid-cols-[15rem_minmax(0,1fr)] wide:gap-4",
        className
      )}
      {...props}
    >
      <div className="flex flex-col gap-1">
        <FieldLabel optional={optional}>{label}</FieldLabel>
        {description ? <FieldDescription>{description}</FieldDescription> : null}
      </div>
      <div className="flex min-w-0 flex-col gap-1">{children}</div>
    </Field>
  )
}

export {
  Field,
  FieldContent,
  FieldControl,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldRow,
  FieldRows,
  FieldSeparator,
  FieldSet,
  FieldTitle,
  useFieldContext,
}
