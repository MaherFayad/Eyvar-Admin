/**
 * A translated sentence with **one LTR-pinned run inside it** — design §11's
 * eight cases: `Sent to ••••••67`, `For fahad@eyvar.com`,
 * `Signed in as fahad@eyvar.com`, `Use +966 55 123 4567 from your profile`,
 * `Trusted until 12 September 2026`, `Sign out of Safari on iPhone?`.
 *
 * ## The problem this exists to solve
 *
 * The sentence has to stay **one key with a named placeholder** (**AC-670**) —
 * no concatenation, ever. But the value inside it has to be wrapped in a
 * `<bdi dir="ltr">` so an email, a phone number, an IP or a masked digit run
 * does not reorder in Arabic (**AC-675**). Those two requirements pull apart:
 * `t()` returns a finished *string*, and a string cannot contain an element.
 *
 * The usual workarounds are both wrong. Splitting the *result* on the value
 * breaks when the value happens to occur elsewhere in the sentence. Splitting
 * the *template* needs raw template access, which `Translate` deliberately does
 * not expose — it is what stops a caller assembling one.
 *
 * ## What this does instead
 *
 * Interpolates a **sentinel** — `U+0000`, which cannot appear in any dictionary
 * — and splits on that. One key, one placeholder, one substitution point,
 * located exactly where the translator put it. In Arabic the placeholder moves
 * within the sentence and the split follows it, which is the whole point.
 *
 * ## Two prop bags, not a `<Bdi>` component
 *
 * `isolatedRunProps` returns `{ box, run }` and `run.className` is typed
 * `never`. That is deliberate (`DECISIONS.md` CARRIED item 3): a `<Bdi>` that
 * forwards `className` reintroduces the stretched-`<bdi>` defect the first time
 * somebody passes `flex-1`. **Layout goes on the box; the isolated run gets
 * nothing but its direction.**
 */

import type { LtrRunKind, Translator } from '@/lib'
import { isolatedRunProps } from '@/lib'

/** Not a character any dictionary can contain, so the split is unambiguous. */
const SENTINEL = '\u0000'

/**
 * A translated sentence split around its single placeholder, so an element can
 * be rendered **where the translator put it** rather than where English word
 * order happens to leave it.
 *
 * Exported because the onboarding intro needs the same trick for a link, and
 * two implementations of "find the placeholder" is one too many.
 */
export function splitAroundPlaceholder(
  t: Translator,
  key: string,
  name: string,
): [before: string, after: string] {
  const [before = '', after = ''] = t(key, { [name]: SENTINEL }).split(SENTINEL)
  return [before, after]
}

export interface IsolatedValueProps {
  t: Translator
  /** The key of a sentence carrying exactly one placeholder. */
  tKey: string
  /** The placeholder's name — `email`, `hint`, `phone`, `date`, `device`. */
  name: string
  /** The value itself. Rendered inside the `<bdi>`, never interpolated as text. */
  value: string
  /** Which of the eight LTR runs. Omit for a value with a strong first character. */
  ltr?: LtrRunKind
  /** Classes for the **box**. There is nowhere else for them to go. */
  className?: string
  /** The element the sentence renders as. `p` by default. */
  as?: 'p' | 'span' | 'div'
}

export function IsolatedValue({
  t,
  tKey,
  name,
  value,
  ltr,
  className,
  as: As = 'p',
}: IsolatedValueProps) {
  const { box, run } = isolatedRunProps(ltr === undefined ? { className } : { ltr, className })
  const [before, after] = splitAroundPlaceholder(t, tKey, name)

  return (
    <As {...box}>
      {before}
      <bdi {...run}>{value}</bdi>
      {after}
    </As>
  )
}
