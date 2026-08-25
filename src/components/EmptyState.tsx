/**
 * `EmptyState` (B-02) — design spec §11.1, **R8**, **AC-37**, **AC-38**.
 *
 * **`kind` is the load-bearing prop, and it is a two-value union on purpose.**
 * There are exactly two kinds of empty and choosing wrongly is a defect:
 *
 *   `first-run`  the whole page, **zero records ever**. Illustration ~160px,
 *                heading naming THE VALUE OF THE SECTION (never the absence of
 *                data), a 1–2 sentence body constrained to ~380px, and an
 *                action row with at least one action.
 *   `no-match`   an empty card, section, timeline, or a list filtered to zero.
 *                **One grey sentence.** No illustration, no heading, and a
 *                plain-button action only where one genuinely exists.
 *
 * Filtered-to-zero is **never** `first-run`: the illustration implies the data
 * does not exist, which is a lie the operator will act on. `useIndexTable`
 * gives you the answer — `table.isFiltered` — so the choice is mechanical, not
 * a judgement call at the call site.
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
import { cn } from '@/lib/utils'

export type EmptyKind = 'first-run' | 'no-match'

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
 * radius, the border and `--ev-shadow-1`; one override.
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
  illustration?: ReactNode
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

export type EmptyStateProps = FirstRunProps | NoMatchProps

export function EmptyState(props: EmptyStateProps) {
  const carded = props.card ?? true

  if (props.kind === 'no-match') {
    const { message, action, className } = props
    const body = (
      /* §4.3 — padding-block 40. One grey sentence, no illustration, no
         heading (**R8**, **AC-37**). The action appears only where one
         GENUINELY exists — `Clear filters` when `table.isFiltered`, nothing
         otherwise. */
      <div className={cn('flex flex-col items-center gap-2 px-3 py-10 text-center', className)}>
        <p className="text-sm text-muted-foreground">{message}</p>
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
      <div className="w-36 text-primary">{illustration ?? <DefaultIllustration />}</div>
      <h3 className="text-base font-semibold text-foreground">{heading}</h3>
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
 * The default `first-run` illustration — muted brand palette, `currentColor`
 * over the parent's `text-primary`, so it tints with the token and cannot
 * introduce a colour. An abstract stack of records, not a mascot: §11.1 asks
 * for an illustration, and a product this dense does not get a cartoon.
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
      <rect x="24" y="21" width="40" height="6" rx="3" className="fill-primary" />
      <rect x="24" y="47" width="56" height="6" rx="3" className="fill-border" />
      <rect x="24" y="73" width="32" height="6" rx="3" className="fill-border" />
    </svg>
  )
}
