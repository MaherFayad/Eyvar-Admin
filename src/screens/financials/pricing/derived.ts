/**
 * The plan editor's computed fields — spec §8, **D-F2**, **AC-393–399**.
 *
 * ## One definition, rendered and evaluated
 *
 * §8.2's rule is that each computed field is defined **once**, that the formula
 * panel renders from those definitions and that the computation evaluates them,
 * with no second copy of any formula in code or in markup. The definitions are
 * `PLAN_PRICING_DEFINITIONS` in the data layer; this file is the evaluator, and
 * it evaluates **the same `expression` string the panel prints**.
 *
 * That is what makes **AC-397** — *"each line's expression matches its
 * definition character for character"* — true by construction rather than by
 * review: there is no second expression to drift from. Legacy has `:1125`
 * (hand-written HTML) and `cr()` (`:12986`), which agree today, *which is worse
 * than disagreeing*, because the drift will be silent when it comes.
 *
 * ## Why an evaluator and not six functions
 *
 * Six hand-written functions would be the second copy. The grammar is tiny —
 * identifiers, decimal literals, parentheses and four operators — and the
 * display characters are the evaluable ones: `−` is U+2212 and `×` is U+00D7,
 * exactly as the panel prints them, so nothing is transliterated between what
 * is shown and what is computed.
 *
 * ## The blank-input rule, and the defect it closes
 *
 * **A blank input is `null`, and `null` propagates.** `gv(id)` returns
 * `parseFloat(value) || 0` — blank is **0** (`:12984`) — while `numval(id,
 * fallback)` returns the **stored** value (`:6150`), and the preview strip
 * reads the first while `savePlan()` reads the second. The operator clears
 * `Discount %`, watches the preview recompute at 0 %, presses Save, and stores
 * 10 %. Here one coercion serves both (`parseNumericInput`, blank → `null`) and
 * a `null` anywhere in a chain makes every dependent value `null`, which
 * **AC-393** requires to render an em dash — never `0.00 SAR`, never a stale
 * number.
 *
 * ## Rounding — M-1 and M-3
 *
 * The chain carries **full precision** until the first definition that declares
 * `rounds`, which is `driverEarns`; `platformKeeps` is the **residual**
 * (`planTotal − driverEarns`), so the two legs always sum to the total exactly
 * and the platform absorbs the rounding. Legacy rounds at every step (`r2()`,
 * `:19889`, plus nine inline round-to-two calls), so a three-step chain rounds
 * three times and the error compounds in one direction.
 *
 * **This file is not in `src/lib`.** The spec assigns the evaluator to
 * utilities-engineer (§14) and it has not landed; `src/lib` has a single owner
 * and a screen may not write there. It lives here, screen-local, and moves to
 * `src/lib` **with** that owner the day a second caller exists — the same rule
 * `src/screens/queues/hooks.ts` states for its three hooks.
 */

import { PLAN_PRICING_DEFINITIONS, PLAN_EXAMPLE_INPUTS } from '@/data/types'
import type { DerivedFieldDefinition } from '@/data/types'

/* ───────────────────────────── the evaluator ───────────────────────────── */

export type Scope = Readonly<Record<string, number | null>>

const MINUS = '−'
const TIMES = '×'

type Token =
  | { kind: 'number'; value: number }
  | { kind: 'name'; value: string }
  | { kind: 'op'; value: '+' | '-' | '*' | '/' }
  | { kind: 'paren'; value: '(' | ')' }

/**
 * The tokeniser. **The display characters are the evaluable ones**: U+2212 is
 * the minus and U+00D7 is the multiplication sign, because that is what the
 * formula panel prints. ASCII `-` and `*` are accepted too, so a definition
 * written either way evaluates the same.
 */
function tokenise(expression: string): Token[] {
  const tokens: Token[] = []
  let index = 0

  while (index < expression.length) {
    const char = expression[index] as string

    if (char === ' ') {
      index += 1
      continue
    }
    if (char === '(' || char === ')') {
      tokens.push({ kind: 'paren', value: char })
      index += 1
      continue
    }
    if (char === '+' || char === '-' || char === MINUS) {
      tokens.push({ kind: 'op', value: char === '+' ? '+' : '-' })
      index += 1
      continue
    }
    if (char === '*' || char === TIMES) {
      tokens.push({ kind: 'op', value: '*' })
      index += 1
      continue
    }
    if (char === '/') {
      tokens.push({ kind: 'op', value: '/' })
      index += 1
      continue
    }
    if (/[0-9.]/.test(char)) {
      let literal = ''
      while (index < expression.length && /[0-9.]/.test(expression[index] as string)) {
        literal += expression[index]
        index += 1
      }
      tokens.push({ kind: 'number', value: Number(literal) })
      continue
    }
    if (/[A-Za-z_]/.test(char)) {
      let name = ''
      while (index < expression.length && /[A-Za-z0-9_]/.test(expression[index] as string)) {
        name += expression[index]
        index += 1
      }
      tokens.push({ kind: 'name', value: name })
      continue
    }

    /* An unknown character means the definition and this grammar disagree, and
       a silent skip would compute a different formula from the one printed —
       the exact drift D-F2 exists to prevent. */
    throw new Error(`Unexpected character "${char}" in plan-pricing expression "${expression}"`)
  }

  return tokens
}

/**
 * Recursive descent over `expression → term (('+' | '−') term)*`.
 *
 * **`null` propagates.** Any identifier the scope does not hold, or holds as
 * `null`, makes the whole expression `null` — §8.2's *"a derived value with no
 * computable result MUST render an em-dash"*, arriving from the arithmetic
 * rather than from a check somebody has to remember at each call site.
 */
export function evaluateExpression(expression: string, scope: Scope): number | null {
  const tokens = tokenise(expression)
  let position = 0

  const peek = (): Token | undefined => tokens[position]

  function parseExpression(): number | null {
    let left = parseTerm()
    for (;;) {
      const token = peek()
      if (token?.kind !== 'op' || (token.value !== '+' && token.value !== '-')) return left
      position += 1
      const right = parseTerm()
      if (left === null || right === null) left = null
      else left = token.value === '+' ? left + right : left - right
    }
  }

  function parseTerm(): number | null {
    let left = parseFactor()
    for (;;) {
      const token = peek()
      if (token?.kind !== 'op' || (token.value !== '*' && token.value !== '/')) return left
      position += 1
      const right = parseFactor()
      if (left === null || right === null) left = null
      else if (token.value === '*') left = left * right
      /* Division by zero yields `null`, not `Infinity`: **AC-342**'s rule is
         about a percentage, and the same reasoning applies to every quotient in
         this chain — `Infinity` survives neither the formatter nor a reader. */
      else left = right === 0 ? null : left / right
    }
  }

  function parseFactor(): number | null {
    const token = peek()
    if (token === undefined) throw new Error(`Unexpected end of expression "${expression}"`)

    if (token.kind === 'op' && (token.value === '+' || token.value === '-')) {
      position += 1
      const value = parseFactor()
      if (value === null) return null
      return token.value === '-' ? -value : value
    }
    if (token.kind === 'number') {
      position += 1
      return token.value
    }
    if (token.kind === 'name') {
      position += 1
      const value = scope[token.value]
      return value === undefined ? null : value
    }
    if (token.kind === 'paren' && token.value === '(') {
      position += 1
      const value = parseExpression()
      const closing = peek()
      if (closing?.kind !== 'paren' || closing.value !== ')') {
        throw new Error(`Unbalanced parentheses in "${expression}"`)
      }
      position += 1
      return value
    }
    throw new Error(`Unexpected token in "${expression}"`)
  }

  const result = parseExpression()
  if (position !== tokens.length) throw new Error(`Trailing tokens in "${expression}"`)
  return result
}

/* ───────────────────────────── the plan chain ──────────────────────────── */

export interface PlanPricingInputs {
  commissionPercent: number | null
  discountPercent: number | null
  executeDays: number | null
  economyPerMinuteHalalas: number | null
  economyPerKmHalalas: number | null
  comfortPerMinuteHalalas: number | null
  comfortPerKmHalalas: number | null
}

export type PlanClass = 'economy' | 'comfort'

/** One computed value, as the panel and the preview strip both read it. */
export interface DerivedValue {
  id: string
  labelKey: string
  expression: string
  unit: DerivedFieldDefinition['unit']
  /** `null` when any input it reads is blank — **AC-393**. */
  value: number | null
}

/**
 * **M-2** — half away from zero, on the absolute value. `Math.round` alone
 * rounds `-0.5` to `-0`, which is a different rule in the negative half and is
 * the kind of asymmetry a ledger notices at the end of a month.
 */
export function roundHalalas(value: number): number {
  return value < 0 ? -Math.round(Math.abs(value)) : Math.round(value)
}

/**
 * Evaluate every definition, in order, for one vehicle class.
 *
 * Each result is written back into the scope under its own id, so a definition
 * that reads `grossPerTrip` reads the value this chain just computed rather
 * than a second copy of the same arithmetic.
 */
export function derivePlanClass(
  inputs: PlanPricingInputs,
  planClass: PlanClass,
  definitions: readonly DerivedFieldDefinition[] = PLAN_PRICING_DEFINITIONS,
): DerivedValue[] {
  const scope: Record<string, number | null> = {
    exampleMinutes: PLAN_EXAMPLE_INPUTS.exampleMinutes,
    exampleKm: PLAN_EXAMPLE_INPUTS.exampleKm,
    commissionPercent: inputs.commissionPercent,
    discountPercent: inputs.discountPercent,
    executeDays: inputs.executeDays,
    perMinuteHalalas:
      planClass === 'economy' ? inputs.economyPerMinuteHalalas : inputs.comfortPerMinuteHalalas,
    perKmHalalas:
      planClass === 'economy' ? inputs.economyPerKmHalalas : inputs.comfortPerKmHalalas,
  }

  const out: DerivedValue[] = []
  for (const definition of definitions) {
    const raw = evaluateExpression(definition.expression, scope)
    /* M-1 — the first and only rounding in the chain is the one the definition
       declares. `platformKeeps` takes the residual after it, so the legs sum. */
    const value = raw === null ? null : definition.rounds ? roundHalalas(raw) : raw
    scope[definition.id] = value
    out.push({
      id: definition.id,
      labelKey: definition.labelKey,
      expression: definition.expression,
      unit: definition.unit,
      value,
    })
  }
  return out
}

/**
 * The two classes the worked example renders, from the same definitions.
 *
 * **AC-399 / D-F4** — the example is computed from the same chain as the
 * preview strip, and it excludes surge because a plan leg is *structurally*
 * excluded from surge (`rateCard.surge.appliesToPlanLegs: false`, `:21459`, and
 * `fareFor(…, {isPlanLeg: true})` forces the multiplier to 1, `:21474`). The
 * note states that assumption on the panel; it is not folded in silently.
 */
export function derivePlan(inputs: PlanPricingInputs): Record<PlanClass, DerivedValue[]> {
  return {
    economy: derivePlanClass(inputs, 'economy'),
    comfort: derivePlanClass(inputs, 'comfort'),
  }
}

/**
 * The recompute listener set — §8.2's second testable consequence.
 *
 * *"The recompute listener set equals the union of every definition's inputs."*
 * Legacy binds 7 listeners (`:13000`) while the formula and the save handler
 * read 11, so the strip shows a stale number with no indication. Here the set
 * is derived from the definitions, so it cannot fall behind them.
 */
export const PLAN_RECOMPUTE_INPUTS: readonly string[] = [
  ...new Set(PLAN_PRICING_DEFINITIONS.flatMap((definition) => definition.inputs)),
].filter((id) => !PLAN_PRICING_DEFINITIONS.some((definition) => definition.id === id))
