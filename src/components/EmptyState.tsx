/**
 * `EmptyState` (B-02) — design spec §11.1, **R8**, **AC-37**, **AC-38**.
 *
 * **`kind` is the load-bearing prop, and it is a three-value union on purpose.**
 * There are exactly three kinds of empty and choosing wrongly is a defect:
 *
 *   `first-run`  the whole page, **zero records ever**. Illustration ~160px,
 *                heading naming THE VALUE OF THE SECTION (never the absence of
 *                data), a 1–2 sentence body constrained to ~380px, and an
 *                action row with at least one action.
 *   `no-match`   an empty card, section, timeline, or a list filtered to zero.
 *                **One grey sentence.** No illustration, no heading, and a
 *                plain-button action only where one genuinely exists.
 *   `cleared`    **a work queue worked to zero.** `04-index-screen-redesign.md`
 *                §10.5, `specs/02-work-queues.md` §4.7 **E1**. One heading, one
 *                line, **no illustration and no action**.
 *
 * Filtered-to-zero is **never** `first-run`: the illustration implies the data
 * does not exist, which is a lie the operator will act on. `useIndexTable`
 * gives you the answer — `table.isFiltered` — so the choice is mechanical, not
 * a judgement call at the call site.
 *
 * **`cleared` is the third kind, and it is F-3.** `specs/02-work-queues.md`
 * §4.7 raised it against this component: *"a queue that is genuinely clear
 * therefore renders first-run — the exact wrong answer"*, and **AC-234 cannot
 * pass without it**. A queue at zero is neither first-run (records have
 * existed, continuously, and will again in a minute) nor no-match (nothing is
 * narrowing). It is a **success**, and *"nobody creates a queue item"* — so the
 * first-run treatment's implicit *"create the first one"* is a lie in the other
 * direction. Q-36 forbids it by name.
 *
 * `isFiltered` cannot decide this one, which is exactly what F-3 said: an
 * unfiltered zero is `cleared` on a queue and `first-run` on an index, and on
 * Safety & Incidents — the one queue whose E3 is genuinely reachable (Q-37) —
 * it is **both, on different days**. So `DataTable` grew an explicit
 * `emptyKind` for the unfiltered branch and the call site decides. The filtered
 * branch stays mechanical; nothing there needed changing.
 *
 * **shadcn's `empty` was deliberately not added** (0.4 R-1, upheld by
 * product-designer). It encodes one illustrated shape behind a slot API, which
 * is "a cheaper way to violate R8": a slot puts the wrong empty one import
 * away, whereas a two-value `kind` prop makes the wrong empty
 * *unrepresentable*. The two shapes are not its shape either — `no-match` is a
 * sentence aligned to content inside a `<td colspan>`, and `first-run` splits
 * the illustration (inside the card) from `Learn more about {resource}.`
 * (outside it, §11.1 and V-11).
 *
 * Rules applied
 *   §11.1       heading 15px/600 (`text-base`), body ≤ ~380px, actions in a row.
 *   §11.1       page-header actions that cannot work with zero records render
 *               DISABLED AND VISIBLE, not hidden. That is `PageHeader`'s job;
 *               named here because this is where someone will be tempted.
 *   `copy.md`   the heading names what the section is FOR. Not "No captains".
 *   R-3 §1.3    no elevation. An empty state sits inside a card that already
 *               carries tier 1.
 */

import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { InfoHint } from '@/components/InfoHint'
import type { Translate } from '@/lib'
import { cn } from '@/lib/utils'

export type EmptyKind = 'first-run' | 'no-match' | 'cleared'

/**
 * **X15 — the half-sentence the one-line body had to drop.**
 *
 * The body stays inside its 12-word budget and says what the operator must read
 * to act; the clause that only explains sits behind the icon beside the title.
 * `t` is required by the arm that admits a hint, so `hint` alone does not type
 * check and cannot render a button with no accessible name.
 */
type HintSlot = { hint?: ReactNode; t: Translate } | { hint?: undefined; t?: undefined }

export interface EmptyAction {
  label: string
  onClick: () => void
  /** R3 — at most one primary anywhere on the screen. Default is the secondary. */
  primary?: boolean
}


/**
 * **All four states sit inside a card** — `02-visual-refinement.md` §4, item 10.
 *
 * They used to render straight onto `--ev-bg` with nothing under them, and a
 * centred grey paragraph on a grey canvas with no ground reads as broken chrome
 * rather than as a designed state. Measured on `customers-empty-state.webp`:
 * Shopify's empty state is **inside a card**, at the full content width, 442px
 * tall, with `Learn more about customers.` **outside and beneath it** — which is
 * V-11 and our own §11.1 exactly. The card is the part we had dropped.
 *
 * **The decision left to me was prop vs. wrapper** (§7.1 of that spec). A PROP,
 * because the ruling is *"the default must be carded"* and a wrapper cannot have
 * a default — every call site would have to remember, and the two that forget
 * are the two nobody looks at. `card` is opt-OUT, for the one real case: a state
 * rendered inside a card that already exists, e.g. `no-match` in a `<td
 * colspan>` under a live toolbar.
 *
 * `scope="row"` has no `card` prop at all. It replaces one table cell; a card
 * there is not a styling mistake, it is a structural one, so the type forbids it
 * rather than the review catching it.
 *
 * The card recipe itself is NOT re-typed here — it is `Card`, with its own
 * padding-block zeroed so the state owns its vertical rhythm. One source for the
 * radius and the border; one override.
 */
function StateCard({ children }: { children: ReactNode }) {
  return <Card className="w-full py-0">{children}</Card>
}

interface FirstRunProps {
  kind: 'first-run'
  /** §4 — carded by default. Opt out only inside a card that already exists. */
  card?: boolean
  /** §11.1 — names the VALUE of the section, never the absence of data. */
  heading: string
  body: string
  /** At least one. The type does not enforce "at least one"; the review does. */
  actions: EmptyAction[]
  /**
   * The art above the heading. **`null` renders NONE** — omitting the prop
   * takes the default, which is a different thing and is why this is not
   * simply optional.
   *
   * Before this arm existed the render read `illustration ?? <Default/>`, so
   * **no caller could opt out**: a first-run empty placed inside a card that
   * already exists shipped art inside a card, which §R8 forbids. `card={false}`
   * turned the frame off and had no say over the picture. The two are separate
   * decisions and now have separate switches.
   */
  illustration?: ReactNode | null
  className?: string
}

interface NoMatchProps {
  kind: 'no-match'
  /** §4 — carded by default. Opt out only inside a card that already exists. */
  card?: boolean
  /** ONE grey sentence. Takes a period (R6). */
  message: string
  action?: EmptyAction
  className?: string
}

/**
 * **E1 — the queue is clear** (`specs/02-work-queues.md` §4.7,
 * `04-index-screen-redesign.md` §10.5).
 *
 * A heading and one line. **No `actions` field at all, and no `illustration`**
 * — the type forbids both rather than a review catching them, because the whole
 * defect F-3 names is a state that offers the operator something to create.
 */
interface ClearedProps {
  kind: 'cleared'
  /** §4 — carded by default. Opt out only inside a card that already exists. */
  card?: boolean
  /**
   * §4.7 E1: *"one sentence naming the scope that is clear"*. The heading names
   * the outcome (`Nothing waiting`); `body` names the scope, per view.
   */
  heading: string
  body: string
  className?: string
}

export type EmptyStateProps = (FirstRunProps | NoMatchProps | ClearedProps) & HintSlot

export function EmptyState(props: EmptyStateProps) {
  const carded = props.card ?? true
  /* X15 — one icon, whichever arm renders. Beside the title, never instead of
     it: `InfoHint` returns `null` for a nullish child, so an arm with no hint
     draws nothing at all rather than an empty tooltip. */
  const hintIcon = props.t ? <InfoHint t={props.t}>{props.hint}</InfoHint> : null

  if (props.kind === 'cleared') {
    const { heading, body, className } = props
    const content = (
      /* §10.5 — 180px block, no illustration, no action. The heading is 13/500
         `--ev-ink` and the line beneath is 13/400 `--ev-text-2`: this is a
         quieter register than `first-run`'s 15/600, deliberately, because a
         cleared queue is not an event and must not read as one. */
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-1 px-3 py-18 text-center',
          className,
        )}
      >
        <p className="flex items-center gap-1 text-sm font-medium text-foreground">
          {heading}
          {hintIcon}
        </p>
        <p className="max-w-96 text-sm text-muted-foreground">{body}</p>
      </div>
    )
    return carded ? <StateCard>{content}</StateCard> : content
  }

  if (props.kind === 'no-match') {
    const { message, action, className } = props
    const body = (
      /* §4.3 — padding-block 40. One grey sentence, no illustration, no
         heading (**R8**, **AC-37**). The action appears only where one
         GENUINELY exists — `Clear filters` when `table.isFiltered`, nothing
         otherwise. */
      <div className={cn('flex flex-col items-center gap-2 px-3 py-10 text-center', className)}>
        {/* No heading on this arm (R8), so the icon sits beside the sentence
            that stands in for one. */}
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          {message}
          {hintIcon}
        </p>
        {action && (
          <Button variant="ghost" size="default" onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </div>
    )
    return carded ? <StateCard>{body}</StateCard> : body
  }

  const { heading, body, actions, illustration, className } = props
  const content = (
    /* §4.2 — padding-block 64. The gap between the illustration and the
       heading is 20 and between heading and body is 8, which `gap-3` plus the
       heading's own line box approximates on the 4px grid. */
    <div
      className={cn(
        'flex flex-col items-center gap-3 px-3 py-16 text-center',
        className,
      )}
    >
      {/* 144px, INSIDE the card (§11.1). Not 160: Shopify measures 146 and
          D-2 puts us one 4px step denser (§4.2). `w-36` = 144. */}
      {/* `text-muted-foreground`, not `text-primary`. `--primary` is
          `--ev-ink` under D7, so a caller passing `currentColor` art would
          have got a near-black block where the class was written to mean
          "muted brand". This is fix-list item 10's audit clause. */}
      <div className="w-36 text-muted-foreground">
        {/* `undefined` takes the default; `null` is an explicit refusal. A
            nullish coalesce cannot tell those apart, which is the defect this
            replaced. */}
        {illustration === null ? null : (illustration ?? <DefaultIllustration />)}
      </div>
      <h3 className="flex items-center gap-1 text-base font-semibold text-foreground">
        {heading}
        {hintIcon}
      </h3>
      {/* Constrained to 384px so the sentence keeps a readable measure. 96
          spacing units = 384px, on the 4px grid — no arbitrary value. */}
      <p className="max-w-96 text-sm text-muted-foreground">{body}</p>
      <div className="flex items-center gap-2">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant={action.primary ? 'default' : 'secondary'}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  )
  return carded ? <StateCard>{content}</StateCard> : content
}

/**
 * The default `first-run` illustration — an abstract stack of records, not a
 * mascot: §11.1 asks for an illustration, and a product this dense does not get
 * a cartoon. Every fill is a token, so it cannot introduce a colour.
 *
 * **Re-toned under D7, and the reason is a remap rather than taste.** It used
 * the primary fill for its accent bar and the border fill for the two quiet
 * ones. (Named, not spelled: a utility written in prose is emitted as a rule.)
 * `--primary` moved from brand blue to `--ev-ink`, which would have painted a
 * near-black bar in a "muted brand" illustration; `--border` moved two ramp
 * steps lighter to `#f0f2f4`, which is 1.12 : 1 on a white card and would have
 * painted nothing at all. Both are now explicit:
 *   the highlighted row keeps `fill-info` (`--ev-blue-lt`) with its bar in
 *   `fill-info-foreground` (`--ev-blue-dk`, 6.09 : 1 on that fill) — the one
 *   place blue survives here, as decoration on its own pale ground;
 *   the two resting rows are `fill-muted` with `fill-muted-foreground` bars.
 *
 * It does **not** mirror (§9.5): it is an object, and there is no reading
 * direction in it.
 */
function DefaultIllustration() {
  return (
    <svg viewBox="0 0 160 96" className="w-full" aria-hidden="true" focusable="false">
      <rect x="12" y="14" width="136" height="20" rx="6" className="fill-info" />
      <rect x="12" y="40" width="136" height="20" rx="6" className="fill-muted" />
      <rect x="12" y="66" width="136" height="20" rx="6" className="fill-muted" />
      <rect x="24" y="21" width="40" height="6" rx="3" className="fill-info-foreground" />
      <rect x="24" y="47" width="56" height="6" rx="3" className="fill-muted-foreground" />
      <rect x="24" y="73" width="32" height="6" rx="3" className="fill-muted-foreground" />
    </svg>
  )
}
