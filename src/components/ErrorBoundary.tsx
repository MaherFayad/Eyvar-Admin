/**
 * `ErrorBoundary` — the console's floor under a render throw (**P1-8**).
 *
 * Before this there was none: zero `componentDidCatch` and zero
 * `getDerivedStateFromError` in `src/`, so one throw inside one cell unmounted
 * the whole React tree and left an operator mid-shift looking at a white
 * document with no rail, no nav and nothing to press. **A console showing a
 * broken panel is strictly better than a console showing nothing**, because the
 * first one can still be navigated away from.
 *
 * ## Two levels, and the level decides how much stops working
 *
 *   `page`  wrapped around the ROUTER OUTLET in `AppLayout`. A throw inside a
 *           screen replaces the content region and **nothing else**: the rail,
 *           the sub-tab list and the top bar are outside this boundary by
 *           construction, so §9.2's *"the single most important shell
 *           behaviour"* holds for a crash exactly as it already held for a
 *           failed read.
 *   `card`  wrapped around a pane that can fail on its own — a chart is the
 *           obvious case, because a plot library reaches into data shapes no
 *           type checked. The card keeps its title and its actions; one grey
 *           sentence replaces the body.
 *
 * There is no `row` scope. A boundary per row would catch a throw and hide it
 * 25 times over on one screen, which is how a systematic data defect gets
 * mistaken for a flaky row.
 *
 * ## The fallback is a designed state, not a stack
 *
 * It renders `ErrorState` — the same component, the same card, the same
 * typography and the same `Try again` as every failed read in the product. An
 * operator should not be able to tell from the shape of the surface whether the
 * network failed or the code did, because the move they make next is identical.
 *
 * **Copy obeys §5.7**: sentence case, no `Oops`, no `Sorry`, no exclamation
 * mark, no `please`, British spelling, and an imperative that names the way out
 * (`state.crash*` in `dictionaries.ts`).
 *
 * **In development the actual error text is shown; in production it is not.**
 * `isDevEnvironment()` is the switch. A production operator cannot act on
 * `Cannot read properties of undefined`, and the message can carry record data
 * from the row that threw.
 *
 * ## `Try again` really remounts
 *
 * Clearing the error alone re-renders the same failing element and throws
 * again, so the reset also bumps `attempt`, which is the `key` on the wrapper
 * around `children`. A new key is a new subtree: every hook re-runs, every
 * `useAsync` refetches, and the transient state that caused the throw is gone.
 * `resetKeys` does the same thing automatically — `AppLayout` passes the
 * pathname, so navigating away from a crashed screen clears it without the
 * operator pressing anything.
 *
 * Rules applied
 *   §11.2/V8   the fallback IS `ErrorState`; this file invents no visual
 *              language of its own and contains no colour, no icon and no
 *              layout beyond what that component already owns.
 *   §5.7/R6    copy through keys; the heading is a phrase, the body a sentence.
 *   AC-24      shell intact — the boundary sits INSIDE `<main>`.
 *   R3         one primary. `Try again` is it; the escape is a ghost button.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorState } from './ErrorState'
import { isDevEnvironment, type Translate } from '@/lib'

export interface ErrorBoundaryProps {
  /** `page` for a route, `card` for a pane that can fail alone. */
  scope: 'page' | 'card'
  t: Translate
  /**
   * What failed, in the operator's words — a route title, a card title. Omitted
   * gives the generic sentence; it is never assembled from a component name.
   */
  name?: string
  /**
   * Any change to these remounts the subtree and clears the error. `AppLayout`
   * passes the location, so a crashed screen does not follow the operator to
   * the next route.
   */
  resetKeys?: readonly unknown[]
  /**
   * `page` only — the way out beside the retry.
   *
   * **A callback, not a `{ label, onClick }` pair, and that is the whole
   * point.** Building the label at the call site means `t('state.crashPage.
   * escape')` is evaluated on EVERY render of a healthy shell, and
   * `createTranslator` throws on a missing key — so one typo in a string that
   * only a crashed page ever shows would blank every route in the product.
   * This file resolves its own copy, inside the error branch, where a throw
   * costs one panel instead of the console. (Observed, not theorised: it blanked
   * the running app for as long as the key was missing from the dictionary.)
   */
  onEscape?: () => void
  /** `card` only — opt out when the pane already sits inside a card. */
  card?: boolean
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
  /** The remount counter. See "`Try again` really remounts" above. */
  attempt: number
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, attempt: 0 }

  static getDerivedStateFromError(error: unknown): Partial<ErrorBoundaryState> {
    return { error: error instanceof Error ? error : new Error(String(error)) }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    /* The one place a stack is allowed to go. Not a toast, not a banner: an
       operator cannot act on it. In production this is where a reporter would
       be called; there is no reporter yet, and inventing one is a decision
       nobody has taken. */
    if (isDevEnvironment()) {
      console.error('[ErrorBoundary]', error, info.componentStack)
    }
  }

  componentDidUpdate(previous: ErrorBoundaryProps): void {
    if (this.state.error === null) return
    if (!changed(previous.resetKeys, this.props.resetKeys)) return
    this.reset()
  }

  private reset = (): void => {
    this.setState((state) => ({ error: null, attempt: state.attempt + 1 }))
  }

  render(): ReactNode {
    const { error, attempt } = this.state
    const { scope, t, name, onEscape, card, children } = this.props

    if (error === null) {
      /* The key is the remount. A `<div>` here would add a box to every screen
         in the product; a keyed fragment adds nothing to the DOM. */
      return <Remount key={attempt}>{children}</Remount>
    }

    /* DEV ONLY, and built rather than passed so a production bundle never even
       has the string in hand. `<pre>` wraps rather than scrolls: a horizontal
       scrollbar inside an error state is a second thing to discover. */
    const detail = isDevEnvironment() ? (
      <details className="mt-3 max-w-96 text-start">
        <summary className="cursor-pointer text-xs text-muted-foreground">
          {t('state.crash.detail')}
        </summary>
        <pre className="mt-1 overflow-hidden text-xs whitespace-pre-wrap text-muted-foreground">
          {error.message}
        </pre>
      </details>
    ) : undefined

    const retry = { label: t('state.crashPage.action'), onClick: this.reset }

    if (scope === 'card') {
      return (
        <ErrorState
          scope="card"
          card={card ?? true}
          message={
            name === undefined
              ? t('state.crashCard.messageGeneric')
              : t('state.crashCard.message', { resource: name })
          }
          action={retry}
          detail={detail}
        />
      )
    }

    return (
      <ErrorState
        scope="page"
        heading={
          name === undefined
            ? t('state.crashPage.titleGeneric')
            : t('state.crashPage.title', { resource: name })
        }
        message={t('state.crashPage.body')}
        action={retry}
        secondaryAction={
          onEscape ? { label: t('state.crashPage.escape'), onClick: onEscape } : undefined
        }
        detail={detail}
      />
    )
  }
}

/** Exists only to carry a `key`. */
function Remount({ children }: { children: ReactNode }) {
  return <>{children}</>
}

function changed(a: readonly unknown[] | undefined, b: readonly unknown[] | undefined): boolean {
  if (a === b) return false
  if (a === undefined || b === undefined) return true
  if (a.length !== b.length) return true
  return a.some((value, index) => !Object.is(value, b[index]))
}
