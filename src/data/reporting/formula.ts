/**
 * Report-builder formula grammar (`02-report-builder-v2.md` §2.2's
 * `expr`/`term`/`factor` verbatim): `parseFormula` (AC-1104), `formulaUnit`
 * (AC-1105…AC-1107), `evaluateFormula` (a gap is `null`, never `0`).
 */

import type { CurrencyCode } from '@/data/types/common'
import type { MetricUnit } from '@/data/types/metrics'
import type { Temporality } from '@/data/types/measure'
import { toLatinDigits } from '@/lib/parse/input'

/* ──────────────────────────── the grammar ───────────────────────────────── */

export type FormulaRef = 'A' | 'B'
export type FormulaOperator = '+' | '-' | '*' | '/'
export type FormulaFunction = 'ROLLAVG' | 'CUMSUM' | 'DELTA' | 'PCT'

const FUNCTION_NAMES: readonly FormulaFunction[] = ['ROLLAVG', 'CUMSUM', 'DELTA', 'PCT']

export type FormulaNode =
  | { kind: 'number'; value: number; at: number }
  | { kind: 'ref'; ref: FormulaRef; at: number }
  | { kind: 'binary'; op: FormulaOperator; left: FormulaNode; right: FormulaNode; at: number }
  | { kind: 'call'; func: FormulaFunction; arg: FormulaNode; n: number | null; at: number }

/* ──────────────────────────── refusals ──────────────────────────────────── */

/** The five refusal codes the plan names (§2.2). WP-1.4 maps these onto `QueryViolationCode`. */
export type FormulaViolationCode =
  | 'formula-parse'
  | 'formula-unknown-ref'
  | 'formula-unit'
  | 'formula-needs-additive'
  | 'formula-needs-split'

/** AC-1104: position and the expected token, so the field can underline exactly where it broke. */
export interface FormulaParseError {
  code: 'formula-parse'
  position: number
  expected: string
  message: string
}

export interface FormulaSemanticError {
  code: 'formula-unknown-ref' | 'formula-unit' | 'formula-needs-additive' | 'formula-needs-split'
  /** Source position of the node that failed, for a field-level squiggle. */
  position: number
  ref: FormulaRef | null
  message: string
}

export type FormulaError = FormulaParseError | FormulaSemanticError

export type FormulaParseResult = { ok: true; node: FormulaNode } | { ok: false; error: FormulaParseError }

/* ──────────────────────────── tokenizer ─────────────────────────────────── */

type Token =
  | { type: 'number'; value: number; pos: number }
  | { type: 'ident'; text: string; pos: number }
  | { type: '+' | '-' | '*' | '/' | '(' | ')' | ','; pos: number }
  | { type: 'eof'; pos: number }

function parseErrorAt(position: number, expected: string): FormulaParseError {
  return { code: 'formula-parse', position, expected, message: `expected ${expected} at position ${position}` }
}

type SimpleTokenType = '+' | '-' | '*' | '/' | '(' | ')' | ','

const SIMPLE_TOKENS: Record<string, SimpleTokenType> = {
  '+': '+',
  '-': '-',
  '*': '*',
  '/': '/',
  '(': '(',
  ')': ')',
  ',': ',',
}

/**
 * §9.2: Arabic-Indic digits. `toLatinDigits` maps one code point to one
 * ASCII digit, keeping the normalised string the same length as the source
 * so every reported position still points at what the operator typed.
 */
function tokenize(source: string): { tokens: Token[] } | { error: FormulaParseError } {
  const normalised = toLatinDigits(source)
  const tokens: Token[] = []
  let i = 0
  const n = normalised.length

  while (i < n) {
    const ch = normalised[i]!

    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i++
      continue
    }

    const simple = SIMPLE_TOKENS[ch]
    if (simple !== undefined) {
      tokens.push({ type: simple, pos: i })
      i++
      continue
    }

    if ((ch >= '0' && ch <= '9') || ch === '.') {
      const start = i
      let sawDot = false
      let sawDigit = false
      while (i < n) {
        const c = normalised[i]!
        if (c >= '0' && c <= '9') {
          sawDigit = true
          i++
        } else if (c === '.' && !sawDot) {
          sawDot = true
          i++
        } else {
          break
        }
      }
      const text = normalised.slice(start, i)
      if (!sawDigit) return { error: parseErrorAt(start, 'a number') }
      tokens.push({ type: 'number', value: Number(text), pos: start })
      continue
    }

    if ((ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z')) {
      const start = i
      while (i < n) {
        const c = normalised[i]!
        if ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z')) i++
        else break
      }
      tokens.push({ type: 'ident', text: normalised.slice(start, i), pos: start })
      continue
    }

    return { error: parseErrorAt(i, "'+', '-', '*', '/', '(', ')', a number, 'A', 'B', or a function name") }
  }

  tokens.push({ type: 'eof', pos: n })
  return { tokens }
}

/* ──────────────────────────── recursive descent ─────────────────────────── */

interface Cursor {
  tokens: Token[]
  pos: number
}

type NodeResult = { ok: true; node: FormulaNode } | { ok: false; error: FormulaParseError }

function peek(c: Cursor): Token {
  return c.tokens[c.pos]!
}

function advance(c: Cursor): Token {
  const t = c.tokens[c.pos]!
  if (c.pos < c.tokens.length - 1) c.pos++
  return t
}

function parseFactor(c: Cursor): NodeResult {
  const token = peek(c)

  if (token.type === 'number') {
    advance(c)
    return { ok: true, node: { kind: 'number', value: token.value, at: token.pos } }
  }

  if (token.type === 'ident') {
    if (token.text === 'A' || token.text === 'B') {
      advance(c)
      return { ok: true, node: { kind: 'ref', ref: token.text, at: token.pos } }
    }

    const func = FUNCTION_NAMES.find((name) => name === token.text)
    if (func !== undefined) {
      const funcAt = token.pos
      advance(c)
      const open = peek(c)
      if (open.type !== '(') return { ok: false, error: parseErrorAt(open.pos, "'('") }
      advance(c)

      const arg = parseExpr(c)
      if (!arg.ok) return arg

      let windowSize: number | null = null
      let comma = peek(c)
      if (comma.type === ',') {
        const commaAt = comma.pos
        advance(c)
        const numTok = peek(c)
        if (numTok.type !== 'number') return { ok: false, error: parseErrorAt(numTok.pos, 'a number') }
        windowSize = numTok.value
        advance(c)
        if (func !== 'ROLLAVG') {
          // Only ROLLAVG's grammar row carries a window; the semantics table
          // (§2.2) gives CUMSUM/DELTA/PCT no second argument at all.
          return { ok: false, error: parseErrorAt(commaAt, "')'") }
        }
      } else if (func === 'ROLLAVG') {
        return { ok: false, error: parseErrorAt(comma.pos, "', <window size>'") }
      }

      const close = peek(c)
      if (close.type !== ')') return { ok: false, error: parseErrorAt(close.pos, "')'") }
      advance(c)

      return { ok: true, node: { kind: 'call', func, arg: arg.node, n: windowSize, at: funcAt } }
    }

    return {
      ok: false,
      error: parseErrorAt(token.pos, "a reference ('A' or 'B') or a function name (ROLLAVG, CUMSUM, DELTA, PCT)"),
    }
  }

  if (token.type === '(') {
    advance(c)
    const inner = parseExpr(c)
    if (!inner.ok) return inner
    const close = peek(c)
    if (close.type !== ')') return { ok: false, error: parseErrorAt(close.pos, "')'") }
    advance(c)
    return inner
  }

  return { ok: false, error: parseErrorAt(token.pos, "a number, 'A', 'B', a function name, or '('") }
}

function parseTerm(c: Cursor): NodeResult {
  let left = parseFactor(c)
  if (!left.ok) return left

  for (;;) {
    const op = peek(c)
    if (op.type !== '*' && op.type !== '/') break
    advance(c)
    const right = parseFactor(c)
    if (!right.ok) return right
    left = { ok: true, node: { kind: 'binary', op: op.type, left: left.node, right: right.node, at: op.pos } }
  }
  return left
}

function parseExpr(c: Cursor): NodeResult {
  let left = parseTerm(c)
  if (!left.ok) return left

  for (;;) {
    const op = peek(c)
    if (op.type !== '+' && op.type !== '-') break
    advance(c)
    const right = parseTerm(c)
    if (!right.ok) return right
    left = { ok: true, node: { kind: 'binary', op: op.type, left: left.node, right: right.node, at: op.pos } }
  }
  return left
}

/**
 * AC-1104: syntax only, never throws. Never reports `formula-unknown-ref`
 * or a unit refusal — those need the query's measures and are
 * `formulaUnit`'s job.
 */
export function parseFormula(expr: string): FormulaParseResult {
  const scanned = tokenize(expr)
  if ('error' in scanned) return { ok: false, error: scanned.error }

  const cursor: Cursor = { tokens: scanned.tokens, pos: 0 }
  const result = parseExpr(cursor)
  if (!result.ok) return result

  const trailing = peek(cursor)
  if (trailing.type !== 'eof') {
    return { ok: false, error: parseErrorAt(trailing.pos, "'+', '-', '*', or '/'") }
  }
  return { ok: true, node: result.node }
}

/* ──────────────────────────── unit rules ────────────────────────────────── */

export interface FormulaRefInfo {
  unit: MetricUnit
  currency: CurrencyCode | null
  additive: boolean
  temporality: Temporality
}

export interface FormulaRefs {
  /** The first measure. Always present — every query has at least one. */
  A: FormulaRefInfo
  /** The second measure, when the query has one. Its absence is what makes `B` unknown. */
  B?: FormulaRefInfo
  /** Whether `groupBy` is non-empty — `PCT` needs a split to have parts to be a share of. */
  hasSplit: boolean
}

export type FormulaUnitResult =
  | { ok: true; unit: MetricUnit; currency: CurrencyCode | null; temporality: Temporality }
  | { ok: false; error: FormulaError }

/** A node's computed shape: a bare number carries no unit until combined with a measure. */
type NodeUnit =
  | { kind: 'scalar' }
  | { kind: 'quantity'; unit: MetricUnit; currency: CurrencyCode | null; additive: boolean }

type UnitResult = { ok: true; value: NodeUnit } | { ok: false; error: FormulaError }

function semanticError(
  code: FormulaSemanticError['code'],
  position: number,
  ref: FormulaRef | null,
  message: string,
): { ok: false; error: FormulaError } {
  return { ok: false, error: { code, position, ref, message } }
}

function collectRefs(node: FormulaNode, out: Set<FormulaRef>): void {
  if (node.kind === 'ref') out.add(node.ref)
  else if (node.kind === 'binary') {
    collectRefs(node.left, out)
    collectRefs(node.right, out)
  } else if (node.kind === 'call') collectRefs(node.arg, out)
}

function unitOf(node: FormulaNode, refs: FormulaRefs): UnitResult {
  switch (node.kind) {
    case 'number':
      return { ok: true, value: { kind: 'scalar' } }

    case 'ref': {
      if (node.ref === 'B' && refs.B === undefined) {
        return semanticError('formula-unknown-ref', node.at, 'B', 'B has no second measure in this query')
      }
      const info = node.ref === 'A' ? refs.A : refs.B!
      return { ok: true, value: { kind: 'quantity', unit: info.unit, currency: info.currency, additive: info.additive } }
    }

    case 'call': {
      const arg = unitOf(node.arg, refs)
      if (!arg.ok) return arg

      if (node.func === 'PCT') {
        if (!refs.hasSplit) {
          return semanticError('formula-needs-split', node.at, null, 'PCT needs a group-by split to be a share of')
        }
        return { ok: true, value: { kind: 'quantity', unit: 'percent', currency: null, additive: true } }
      }

      if (node.func === 'CUMSUM') {
        const additive = arg.value.kind === 'scalar' ? true : arg.value.additive
        if (!additive) {
          return semanticError('formula-needs-additive', node.at, null, 'CUMSUM needs an additive measure')
        }
      }

      // ROLLAVG and DELTA keep the argument's own unit, additive or not.
      return { ok: true, value: arg.value }
    }

    case 'binary': {
      const left = unitOf(node.left, refs)
      if (!left.ok) return left
      const right = unitOf(node.right, refs)
      if (!right.ok) return right

      if (node.op === '*') {
        const promoted = promoteRatioToPercent(node.left, left.value, node.right, right.value)
        if (promoted !== null) return { ok: true, value: promoted }
      }
      return combine(node.op, left.value, right.value, node.at)
    }
  }
}

/**
 * AC-1105: `A / B * 100` is `percent` — scaling a ratio by the exact
 * literal `100` is the grammar's only spelling of "as a percentage"; any
 * other multiplier leaves a scaled, still dimensionless ratio.
 */
function promoteRatioToPercent(
  leftNode: FormulaNode,
  leftUnit: NodeUnit,
  rightNode: FormulaNode,
  rightUnit: NodeUnit,
): NodeUnit | null {
  const isRatio = (u: NodeUnit) => u.kind === 'quantity' && u.unit === 'ratio'
  const isLiteral100 = (n: FormulaNode) => n.kind === 'number' && n.value === 100
  if (isRatio(leftUnit) && isLiteral100(rightNode)) return { kind: 'quantity', unit: 'percent', currency: null, additive: true }
  if (isRatio(rightUnit) && isLiteral100(leftNode)) return { kind: 'quantity', unit: 'percent', currency: null, additive: true }
  return null
}

function combine(op: FormulaOperator, left: NodeUnit, right: NodeUnit, at: number): UnitResult {
  const bothScalar = left.kind === 'scalar' && right.kind === 'scalar'
  const bothQuantity = left.kind === 'quantity' && right.kind === 'quantity'

  if (op === '+' || op === '-') {
    if (bothScalar) return { ok: true, value: { kind: 'scalar' } }
    if (bothQuantity) {
      const l = left as Extract<NodeUnit, { kind: 'quantity' }>
      const r = right as Extract<NodeUnit, { kind: 'quantity' }>
      if (l.unit !== r.unit || l.currency !== r.currency) {
        return semanticError('formula-unit', at, null, `${op} needs both sides in the same unit and currency`)
      }
      return { ok: true, value: l }
    }
    // one side is a bare number: it scales alongside the quantity's own unit.
    return { ok: true, value: left.kind === 'quantity' ? left : right }
  }

  if (op === '*') {
    if (bothQuantity) {
      return semanticError('formula-unit', at, null, 'two measures cannot be multiplied together')
    }
    if (bothScalar) return { ok: true, value: { kind: 'scalar' } }
    const quantity = (left.kind === 'quantity' ? left : right) as Extract<NodeUnit, { kind: 'quantity' }>
    return { ok: true, value: quantity }
  }

  // op === '/'
  if (bothQuantity) return { ok: true, value: { kind: 'quantity', unit: 'ratio', currency: null, additive: false } }
  if (bothScalar) return { ok: true, value: { kind: 'scalar' } }
  const quantity = (left.kind === 'quantity' ? left : right) as Extract<NodeUnit, { kind: 'quantity' }>
  return { ok: true, value: quantity }
}

/**
 * AC-1105 … AC-1107. Parses `expr` and walks the AST against `refs`, returning
 * the resulting unit or the first refusal found, depth-first, left to right.
 * Errors from `parseFormula` are surfaced unchanged as `formula-parse`.
 */
export function formulaUnit(expr: string, refs: FormulaRefs): FormulaUnitResult {
  const parsed = parseFormula(expr)
  if (!parsed.ok) return { ok: false, error: parsed.error }

  const result = unitOf(parsed.node, refs)
  if (!result.ok) return result

  const used = new Set<FormulaRef>()
  collectRefs(parsed.node, used)
  const temporality: Temporality =
    used.size > 0 && [...used].every((ref) => (ref === 'A' ? refs.A : refs.B!).temporality === 'stock')
      ? 'stock'
      : 'flow'

  if (result.value.kind === 'scalar') return { ok: true, unit: 'ratio', currency: null, temporality }
  return { ok: true, unit: result.value.unit, currency: result.value.currency, temporality }
}

/* ──────────────────────────── evaluation ────────────────────────────────── */

export interface FormulaSeriesInput {
  /** Bucket count. Every array below aligns to this length. */
  length: number
  A?: (number | null)[]
  B?: (number | null)[]
  /**
   * Sum of `A` (resp. `B`) across every group in the active split, aligned to
   * buckets — the denominator `PCT(A)` (resp. `PCT(B)`) needs. Absent means
   * "not computable here"; `PCT` then yields a gap rather than guessing.
   */
  totalA?: (number | null)[]
  totalB?: (number | null)[]
}

function seriesOf(ref: FormulaRef, series: FormulaSeriesInput): (number | null)[] {
  const points = ref === 'A' ? series.A : series.B
  return points ?? Array.from({ length: series.length }, () => null)
}

function totalOf(ref: FormulaRef, series: FormulaSeriesInput): (number | null)[] | null {
  const totals = ref === 'A' ? series.totalA : series.totalB
  return totals ?? null
}

function add(a: number | null, b: number | null): number | null {
  return a === null || b === null ? null : a + b
}
function sub(a: number | null, b: number | null): number | null {
  return a === null || b === null ? null : a - b
}
function mul(a: number | null, b: number | null): number | null {
  return a === null || b === null ? null : a * b
}
/** Division by zero is `null`, never `Infinity` (AGENT-BRIEF "the traps"). */
function div(a: number | null, b: number | null): number | null {
  if (a === null || b === null || b === 0) return null
  return a / b
}

function evalBinary(op: FormulaOperator, left: (number | null)[], right: (number | null)[]): (number | null)[] {
  const fn = op === '+' ? add : op === '-' ? sub : op === '*' ? mul : div
  return left.map((value, i) => fn(value, right[i]!))
}

/** `null` until `n` buckets exist; `null` for the window if any point in it is a gap (never fills a gap silently). */
function rollingAverage(points: (number | null)[], n: number): (number | null)[] {
  return points.map((_, i) => {
    if (n <= 0 || i < n - 1) return null
    const window = points.slice(i - n + 1, i + 1)
    if (window.some((v) => v === null)) return null
    const sum = window.reduce((acc: number, v) => acc + (v as number), 0)
    return sum / n
  })
}

/**
 * Mirrors `transforms.ts`'s `cumulative` (AC-1110): a gap does not reset or
 * zero the running total — it carries forward silently — but the gap's own
 * bucket stays `null` so the chart still draws the break.
 */
function cumulativeSum(points: (number | null)[]): (number | null)[] {
  let running = 0
  return points.map((value) => {
    if (value === null) return null
    running += value
    return running
  })
}

function delta(points: (number | null)[]): (number | null)[] {
  return points.map((value, i) => (i === 0 ? null : sub(value, points[i - 1]!)))
}

function percentOfTotal(points: (number | null)[], totals: (number | null)[] | null): (number | null)[] {
  if (totals === null) return points.map(() => null)
  return points.map((value, i) => {
    const total = totals[i]!
    const share = div(value, total)
    return share === null ? null : share * 100
  })
}

function evalNode(node: FormulaNode, series: FormulaSeriesInput): (number | null)[] {
  switch (node.kind) {
    case 'number':
      return Array.from({ length: series.length }, () => node.value)
    case 'ref':
      return seriesOf(node.ref, series)
    case 'binary':
      return evalBinary(node.op, evalNode(node.left, series), evalNode(node.right, series))
    case 'call': {
      if (node.func === 'ROLLAVG') return rollingAverage(evalNode(node.arg, series), node.n ?? 0)
      if (node.func === 'CUMSUM') return cumulativeSum(evalNode(node.arg, series))
      if (node.func === 'DELTA') return delta(evalNode(node.arg, series))
      // PCT: documented (§2.2) over a bare measure reference. A compound
      // argument has no "total across groups" this pure function can derive
      // without every group's series, so it degrades to a gap rather than
      // guessing — see `formula.test.ts` "PCT of a compound expression".
      if (node.arg.kind === 'ref') {
        return percentOfTotal(evalNode(node.arg, series), totalOf(node.arg.ref, series))
      }
      return Array.from({ length: series.length }, () => null)
    }
  }
}

/**
 * Never throws on user input. A parse failure evaluates to a gap at every
 * bucket — the caller is expected to have checked `parseFormula`/
 * `formulaUnit` first; an unreferenced `B` series behaves the same way.
 */
export function evaluateFormula(series: FormulaSeriesInput, expr: string): (number | null)[] {
  const parsed = parseFormula(expr)
  if (!parsed.ok) return Array.from({ length: series.length }, () => null)
  return evalNode(parsed.node, series)
}
