/**
 * Bidi isolation, as props rather than as a component.
 *
 * ## The rule, and the defect that produced it
 *
 * `build/08-breakdowns-and-notices.md` §5.4, **found by eye, live on all eight
 * metric boards**:
 *
 * > `<bdi>` sets its own `direction` from its content. A `<bdi>` that is
 * > *stretched* — a flex child in a column, or `flex-1` — then aligns its text
 * > to **its** start rather than the page's. Under `dir="rtl"` at 1280 the tile
 * > value `42` flushed **left** while its own label flushed **right**.
 * >
 * > **The fix is structural: the `<bdi>` goes INSIDE the box, never as the box.**
 *
 * A content-sized `<bdi>` is always safe, because a box sized to its content has
 * nothing to align inside it. The bug needs three things at once — a `<bdi>`, a
 * class that stretches it, and a `dir="rtl"` page — which is why it survived
 * every source audit and one visual pass.
 *
 * ## Why this is props and not `<Bdi>`
 *
 * design/08 §12 asks for *"a `<Bdi>` helper, or an equivalent"* for its eight
 * LTR-pinned runs. A `<Bdi>` that forwards `className` to the `<bdi>` — which is
 * what `src/components/Money.tsx` does today, and what any convenient wrapper
 * would do — **reintroduces the exact defect** the moment a caller passes
 * `flex-1`. A component that refuses `className` is a component nobody uses,
 * because the run always needs *some* styling and the styling always belongs to
 * the box.
 *
 * So the helper returns **two prop bags and forces you to put them on two
 * elements**. `box` is where every class goes. `run` carries `dir` and nothing
 * else, and its type says `className?: never` so the mistake has to be written
 * deliberately rather than by habit:
 *
 * ```tsx
 * const { box, run } = isolatedRunProps({ ltr: 'email', className: 'flex-1 truncate' })
 * return (
 *   <span {...box}>
 *     <bdi {...run}>{email}</bdi>
 *   </span>
 * )
 * ```
 *
 * `src/lib` holds no JSX (`lib/index.ts`: *"No React, no JSX, no fetching"*) and
 * a shared component is frontend-engineer's file, not utilities-engineer's. This
 * is the part of the answer that belongs here; if a `<Bdi>` component is still
 * wanted it should be built on top of these props, in `src/components`.
 *
 * ## What `dir` to pin
 *
 * A bare `<bdi>` is `dir="auto"` — it takes its direction from the first
 * **strong** character, which is right for a *name* (`Riyadh` inside an Arabic
 * sentence, `فهد` inside an English one) and wrong for a run with no strong
 * character at all. `+966 55 123 4567` starts with `+`, a neutral; under
 * `dir="rtl"` the `+` jumps to the far end. `••••••67`, an IP address and a
 * TOTP secret have the same problem. Those get `dir="ltr"` explicitly, and the
 * eight that do are a **closed set** — same discipline as `MIRRORED_GLYPHS` in
 * `./direction.ts`. Adding a ninth is a review event, not an import.
 *
 * ## What this is not
 *
 * Not U+2066/U+2069. The isolate control characters are the string-level
 * equivalent of `<bdi>` and would let this be a pure `string -> string`
 * function — but `format/money.ts` already ruled against them and it is right:
 * *"Embedding U+2068/U+2069 here would poison copy-paste and assertions."* An
 * operator copies an email out of this console a hundred times a day, and
 * invisible control characters ride along into the next search box.
 */

/**
 * The runs that must be pinned LTR, from design/08 §12's table. Closed on
 * purpose: a value that has a strong first character does **not** belong here,
 * it belongs in the `auto` case.
 *
 * | member | example | why it is not `auto` |
 * |---|---|---|
 * | `email` | `fahad@eyvar.com` | strong-Latin, but sits inside Arabic prose and must not reorder around the `@` |
 * | `ip` | `10.0.4.19` | all digits and dots — no strong character at all |
 * | `phone` | `+966 55 123 4567` | leading `+` is neutral and jumps sides |
 * | `totpSecret` | `JBSW Y3DP EHPK 3PXP` | grouped token; the groups must not reverse |
 * | `maskedHint` | `••••••67` | **AC-675**; bullets are neutral, so the digits would lead |
 * | `date` | `12 September 2026` | a numeral run around a word (§9.2 — digits do not mirror) |
 * | `money` | `42,186.50 SAR` | two LTR runs; `format/money.ts` U-4 |
 * | `otpCode` | `123456` | §4.1 D-OTP-7 — typing `1` then `2` gives `12` in both languages |
 */
export type LtrRunKind =
  | 'email'
  | 'ip'
  | 'phone'
  | 'totpSecret'
  | 'maskedHint'
  | 'date'
  | 'money'
  | 'otpCode'

/** Every member, so a test can enumerate the closed set rather than trust prose. */
export const LTR_RUN_KINDS: readonly LtrRunKind[] = [
  'email',
  'ip',
  'phone',
  'totpSecret',
  'maskedHint',
  'date',
  'money',
  'otpCode',
]

/**
 * Props for the `<bdi>` itself. `className` and `style` are typed `never`: the
 * `<bdi>` is the isolation and only the isolation, and anything that could give
 * it a width belongs on the box.
 */
export interface IsolatedRunProps {
  readonly dir?: 'ltr'
  readonly className?: never
  readonly style?: never
}

/** Props for the element **around** the `<bdi>`. Every class lives here. */
export interface IsolationBoxProps {
  readonly className?: string
}

export interface IsolatedRun {
  readonly box: IsolationBoxProps
  readonly run: IsolatedRunProps
}

export interface IsolatedRunOptions {
  /**
   * Which of the eight LTR-pinned runs this is. Omit for a value with a strong
   * first character — a person's name, a city, a queue title — where `<bdi>`'s
   * own `auto` is correct and pinning `ltr` would be wrong in Arabic.
   */
  readonly ltr?: LtrRunKind
  /** Classes for the **box**. There is nowhere else for them to go. */
  readonly className?: string
}

/* Frozen so a caller cannot mutate the shared object out from under another
   call site; a prop bag that is spread is never a place to store state. */
const LTR_RUN: IsolatedRunProps = Object.freeze({ dir: 'ltr' as const })
const AUTO_RUN: IsolatedRunProps = Object.freeze({})

/**
 * The props for one isolated run: `{ box, run }`.
 *
 * Put `box` on the element that carries layout and `run` on the `<bdi>` inside
 * it — **never the other way round**, which is §5.4's whole finding.
 */
export function isolatedRunProps(options: IsolatedRunOptions = {}): IsolatedRun {
  return {
    box: { className: options.className },
    run: options.ltr === undefined ? AUTO_RUN : LTR_RUN,
  }
}

/**
 * True when `className` would stretch the element it is on, making it unsafe on
 * a `<bdi>`.
 *
 * The escape hatch for the case `isolatedRunProps` cannot see: a hand-written
 * `<bdi className={…}>` in an existing file. A component's own test can assert
 * `expect(stretchesInlineSize(cls)).toBe(false)` and catch §5.4 in source rather
 * than by eye at 1280 in Arabic.
 *
 * The list is what actually stretches an inline-level element in this codebase's
 * Tailwind v4 setup: it becomes a flex/grid item that fills, or it is told to be
 * a block of a given width. `truncate` is **absent on purpose** — it implies
 * `overflow-hidden` and `block`, so it stretches only when a width comes with
 * it, and flagging it would flag most safe cells.
 */
export function stretchesInlineSize(className: string | undefined): boolean {
  if (!className) return false
  return className
    .split(/\s+/u)
    .filter(Boolean)
    .some((token) => {
      /* Strip a variant prefix — `md:flex-1` stretches at `md` and above. */
      const base = token.slice(token.lastIndexOf(':') + 1)
      return (
        base === 'flex-1' ||
        base === 'flex-auto' ||
        base === 'grow' ||
        base === 'flex-grow' ||
        base === 'w-full' ||
        base === 'w-screen' ||
        base === 'self-stretch' ||
        base === 'block' ||
        base === 'flex' ||
        base === 'grid' ||
        base.startsWith('basis-')
      )
    })
}
