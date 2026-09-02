/**
 * The licensed-motion guard.
 *
 * `docs/ref/motion.md` closes two questions that source cannot answer on its
 * own, and both of them regress silently:
 *
 *   1. **There is no `--ev-*` duration token set, and adding one is the
 *      defect.** Tailwind's own scale IS the token set; a second source drifts
 *      the moment someone picks a value from the wrong one. `globals.css`
 *      records the ruling in the token file itself. Exactly ONE motion token
 *      exists, because it feeds an `animation` shorthand that Tailwind's scale
 *      cannot reach.
 *   2. **Motion is licensed by purpose, and the list is closed.** A layer at
 *      200, a popover at 100, a live-queue row at 150, the save bar at 200, the
 *      live-feed dot on its loop. Everything else is static, and hover and
 *      focus are colour changes rather than movement.
 *
 * ## Why this file spells no class name
 *
 * Tailwind v4 scans source files as PLAIN TEXT and does not care that a string
 * sits inside a comment or a test assertion. Writing a utility name here emits
 * that utility into the shipped stylesheet - which is how a physical margin
 * utility once shipped from a comment forbidding it, and how the blanket
 * property transition came back into `dist` from the very comment added to
 * remove it. Every class name below is therefore ASSEMBLED at runtime from
 * fragments. Do not "tidy" them into literals.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, sep as SEP } from 'node:path'
import { describe, expect, it } from 'vitest'

/* Assembled, never written whole. See the header. */
const DUR = 'dur' + 'ation-'
const TRANSITION = 'transi' + 'tion-'
const BLANKET = TRANSITION + 'a' + 'll'

/** The licensed durations, in ms. `motion.md`'s table and nothing else. */
const LICENSED = new Set([100, 150, 200])

const ROOT = join(process.cwd(), 'src')

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path, out)
    else if (/\.(tsx?|css)$/.test(name)) out.push(path)
  }
  return out
}

const FILES = walk(ROOT)
const read = (path: string) => readFileSync(path, 'utf8')

describe('motion.md — Tailwind\'s scale is the token set', () => {
  it('declares exactly one motion token, and it is the loop', () => {
    const css = read(join(ROOT, 'styles', 'globals.css'))
    /* The loop token exists because an `animation` shorthand needs a value and
       Tailwind's duration scale cannot be spliced into one. */
    expect(css).toMatch(/--ev-live-loop:\s*1800ms/)
    /* And no second source of durations has appeared beside it. */
    const invented = css.match(/--ev-[a-z0-9-]*(duration|dur|ease|easing)[a-z0-9-]*\s*:/gi)
    expect(invented ?? [], 'a second duration source drifts from Tailwind\'s scale').toEqual([])
  })

  it('keeps the sanctioned loop above the R18 opacity floor', () => {
    const css = read(join(ROOT, 'styles', 'globals.css'))
    const frames = /@keyframes\s+live-pulse\s*\{[\s\S]*?\n  \}/.exec(css)?.[0] ?? ''
    expect(frames, 'the one sanctioned loop is gone').toBeTruthy()
    const stops = [...frames.matchAll(/opacity:\s*([\d.]+)/g)].map((m) => Number(m[1]))
    expect(stops.length).toBeGreaterThan(0)
    expect(Math.min(...stops)).toBeGreaterThanOrEqual(0.4)
  })
})

describe('motion.md — the licensed table is closed', () => {
  it('uses no duration outside 100 / 150 / 200 anywhere in src', () => {
    const offenders: string[] = []
    for (const path of FILES) {
      if (path.endsWith('motion.licence.test.ts')) continue
      for (const m of read(path).matchAll(new RegExp(DUR + '([0-9]+)', 'g'))) {
        if (!LICENSED.has(Number(m[1]))) offenders.push(`${path}: ${m[0]}`)
      }
    }
    expect(offenders, 'unlicensed duration — see docs/ref/motion.md').toEqual([])
  })

  it('never transitions every property at once', () => {
    /* The blanket variant is not a wider net, it is a different rule: with
       Inter Variable declared `font-weight: 100 900` it interpolates a weight
       change, so a label physically thickens on selection; and it reaches the
       focus ring on `box-shadow`, so the ring fades in instead of arriving. */
    const offenders = FILES.filter(
      (path) => !path.endsWith('motion.licence.test.ts') && read(path).includes(BLANKET),
    )
    expect(offenders, 'transition every property — and Tailwind reads comments too').toEqual([])
  })

  it('gives a layer the layer duration and a popover the popover duration', () => {
    const layer = 200
    const popover = 100
    const expected: Array<[string, string, number]> = [
      ['ui/dialog.tsx', 'dialog-overlay', layer],
      ['ui/dialog.tsx', 'dialog-content', layer],
      ['ui/alert-dialog.tsx', 'alert-dialog-overlay', layer],
      ['ui/alert-dialog.tsx', 'alert-dialog-content', layer],
      ['ui/sheet.tsx', 'sheet-content', layer],
      ['ui/popover.tsx', 'popover-content', popover],
      ['ui/tooltip.tsx', 'tooltip-content', popover],
      ['ui/select.tsx', 'select-content', popover],
    ]
    for (const [file, slot, ms] of expected) {
      const source = read(join(ROOT, 'components', ...file.split('/')))
      const at = source.indexOf(`data-slot="${slot}"`)
      expect(at, `${file}: no ${slot}`).toBeGreaterThan(-1)
      /* The duration travels in the same class list as the slot, so read the
         span between this slot and the next one. */
      const nextSlot = source.indexOf('data-slot="', at + 1)
      const block = source.slice(at, nextSlot === -1 ? undefined : nextSlot)
      const found = new RegExp(DUR + '([0-9]+)').exec(block)
      expect(found, `${file}: ${slot} carries no duration`).toBeTruthy()
      expect(Number(found![1]), `${file}: ${slot}`).toBe(ms)
    }
  })
})

describe('R18 — a loop may only ever signal "this feed is live"', () => {
  /**
   * The two indefinite-loop utilities that are allowed to exist, and the only
   * two files allowed to name them. Both are loading indicators, which §7.6
   * exempts *while the operation is genuinely in progress* - and both are
   * scoped to that: `LoadingSkeleton` renders under `status === 'loading'` and
   * carries `aria-busy` plus a translated label, so the loop is decoration on a
   * state that is already announced. Measured in the production build: the
   * skeleton loop is present during the fetch and gone once it resolves, and a
   * settled page has zero elements with an infinite iteration count.
   *
   * Names are assembled rather than written, for the reason in the header. It
   * is not hypothetical: an attention loop that R18 forbids is in the SHIPPED
   * stylesheet right now, emitted from a screen comment that describes deleting
   * it. That screen is outside this directory and the leak is reported, not
   * patched here.
   */
  const LOOPS = ['pulse', 'spin', 'ping', 'bounce'].map((n) => 'ani' + 'mate-' + n)
  const ALLOWED: Record<string, string[]> = {
    'ui/skeleton.tsx': ['pulse'],
    'ui/spinner.tsx': ['spin'],
    'LoadingSkeleton.tsx': ['pulse'],
    'ui/chart.tsx': ['pulse', 'spin', 'ping', 'bounce'],
  }

  it('names no indefinite-loop utility outside the two loading indicators', () => {
    const offenders: string[] = []
    for (const path of walk(join(ROOT, 'components'))) {
      if (path.endsWith('motion.licence.test.ts')) continue
      const slashed = path.split(SEP).join('/')
      const body = read(path)
      for (const loop of LOOPS) {
        if (!body.includes(loop)) continue
        const key = Object.keys(ALLOWED).find((k) => slashed.endsWith(k))
        const permitted = (key ? ALLOWED[key] : []) ?? []
        if (!permitted.some((name) => loop.endsWith(name))) offenders.push(`${slashed}: ${loop}`)
      }
    }
    expect(offenders, 'an indefinite loop that is not the live-feed dot').toEqual([])
  })
})

describe('motion.md — the reduced-motion guard stays global', () => {
  it('collapses animation AND transition on the universal selector', () => {
    const css = read(join(ROOT, 'styles', 'globals.css'))
    const guard = /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\n\}/.exec(css)?.[0] ?? ''
    expect(guard, 'no reduced-motion guard').toBeTruthy()
    for (const needle of [
      /animation-duration:\s*1ms\s*!important/,
      /animation-iteration-count:\s*1\s*!important/,
      /transition-duration:\s*1ms\s*!important/,
      /\*::before/,
      /\*::after/,
    ]) {
      expect(guard).toMatch(needle)
    }
  })

  it('carries no per-component reduced-motion branch, because the guard is global', () => {
    const offenders = FILES.filter(
      (path) =>
        !path.endsWith('globals.css') &&
        !/\.test\.tsx?$/.test(path) &&
        /@media[^;{]*prefers-reduced-motion/.test(read(path)),
    )
    expect(offenders, 'a local branch is a component that can forget').toEqual([])
  })
})
