/**
 * The request sheet's head — the same deep-green field the rider and captain
 * sheets carry, over the one thing this record is about: **the ride**.
 *
 * ```
 *  ┌──────────────────────────────────────────────────────────────────┬───┐
 *  │  RIDE REQUEST · REQ-503                                          │ ✕ │  --color-hero-label
 *  │  KAFD → Airport T5                                               │   │  --text-band, hero-fg
 *  │  Tariq Al-Saud │ Instant │ Comfort                               │   │  hero-muted
 *  │  No captains found                                               │   │  the badge
 *  └──────────────────────────────────────────────────────────────────┴───┘
 * ```
 *
 * ## Why the ROUTE is the title, and the rider is a meta item
 *
 * This is the whole reason the record kind exists. `RequestsScreen` opened the
 * *rider* from its identity cell, so selecting the thing an operator is
 * deciding about produced somebody's wallet balance and churn risk — facts
 * about a person, on a surface that had been asked a question about a journey.
 * The subject of this record is the journey: where it starts, where it goes,
 * what it is worth and how long it has been unanswered. The rider is a
 * participant in it, one tap away through the Rider group in the panels.
 *
 * ## The badge is here and it is the one exception the band makes
 *
 * The rider band carries no status and the captain band carries a standing;
 * this one carries a `StatusBadge`, because a request's status is not a
 * description of a record, it is **the answer to whether anybody still owes
 * this rider anything**. R5a is untouched: `REQUEST_STATUS` gives `no-drivers`
 * the `warning` tone, never red, and the escalation is carried by the word and
 * by the countdown that sits on the map below.
 *
 * Rules applied
 *   §6.2       ONE header. This replaces `ShellLayer`'s 48px chrome bar rather
 *              than sitting under it — see `ShellLayer`'s `banner` prop, which
 *              exists so a caller cannot end up with two.
 *   tokens     `--color-hero*`, the surface token set whose contrast is
 *              measured in `globals.css`. Never `--ev-brand`, which is a
 *              CONTROL fill measured at 32px.
 *   §7.2       the close control takes the band's own ring
 *              (`ring-hero-foreground` on `ring-offset-hero`), because `--ring`
 *              is `--ev-brand` and brand-green on hero-green is not a visible
 *              ring.
 *   §9.1       logical utilities throughout. The meta row is a flex row, so it
 *              reverses with the document; its separators are 1px spans rather
 *              than a border on one physical side.
 *   AC-73      the eyebrow's id is `<bdi>`-isolated — `REQ-503` is a Latin run
 *              whose internal separator is bidi-neutral, so an Arabic paragraph
 *              walks its pieces backwards without it.
 *   §9.6       nothing is concatenated. The route comes from `requests.route`,
 *              one key with two named placeholders, whose Arabic entry carries
 *              `←` — §9.5's rule that a mirroring glyph is swapped at
 *              string-construction time and never with CSS.
 */

import { XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SheetClose, SheetTitle } from '@/components/ui/sheet'
import { StatusBadge } from '@/components/StatusBadge'
import type { ProfileRef, RideRequest } from '@/data/types'
import type { Translate } from '@/lib'
import { REQUEST_STATUS } from '../domain'

export interface RequestBandProps {
  entity: ProfileRef
  /** `null` until the record arrives. The route and the id do not wait for it. */
  request: RideRequest | null
  t: Translate
}

export function RequestBand({ entity, request, t }: RequestBandProps) {
  /**
   * Built as data so the row can drop an absent fact without leaving an orphan
   * separator — the separators are placed BETWEEN what survives, not beside
   * what might not.
   *
   * Three items, and each is a fact an operator uses to *act*: who is waiting,
   * which queue this is (the two are not variants of each other — §5.1), and
   * what vehicle has to be found. Everything else about the ride is one scroll
   * down in the panels, where it is labelled.
   */
  const meta: string[] = request
    ? [request.riderName, t(`requests.channel.${request.channel}`), request.vehicleClass].filter(
        (value) => value !== '',
      )
    : [entity.subtitle ?? ''].filter((value) => value !== '')

  const status = request === null ? null : REQUEST_STATUS[request.status]

  /**
   * **The route, built here and not taken from the ref.**
   *
   * `requests.route` is one key with two named placeholders, and its Arabic
   * entry reads `{pickup} ← {destination}`: §9.5 swaps a mirroring glyph at
   * string-construction time, never with CSS, and a dictionary entry IS
   * string-construction time. `ProfileRef.title` is minted in the data layer,
   * which has no dictionary and therefore cannot point the arrow — so the ref
   * carries the id (`clients/profile.ts` sets out the whole reasoning, and
   * names `Trip.route` as the version of this that got it wrong).
   *
   * The id is the fallback, and it is a real one rather than a blank: it is
   * what the ref resolved to, so the head is never empty while the record is in
   * flight, and the eyebrow above already prints the same code beside the kind.
   */
  const title =
    request === null
      ? entity.title
      : t('requests.route', { pickup: request.pickup, destination: request.destination })

  return (
    <div className="relative flex flex-col gap-2 bg-hero px-6 py-5 text-hero-foreground">
      {/* `SheetClose` is Radix's dismiss — the same one `Escape` reaches, so
          there is one close path and not two (AC-66). Inside the band, so it is
          painted in the ground's own foreground rather than the sheet's ink. */}
      <SheetClose asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          className="absolute end-3 top-3 text-hero-foreground hover:bg-hero-2 hover:text-hero-foreground focus-visible:ring-hero-foreground focus-visible:ring-offset-hero"
        >
          <XIcon aria-hidden="true" />
          <span className="sr-only">{t('shell.layer.close')}</span>
        </Button>
      </SheetClose>

      {/* What KIND of record, then WHICH one. Two independent labels rather than
          one interpolated string — the kind is a translated noun and the id is a
          Latin code, and gluing them makes one untranslatable run out of two
          correct ones (§9.6). */}
      <p className="flex items-center gap-1.5 pe-8 text-2xs font-medium tracking-widest text-hero-label uppercase">
        <span>{t(`profile.kind.${entity.entityType}`)}</span>
        <span aria-hidden="true">·</span>
        <bdi className="tabular-nums">{entity.entityId}</bdi>
      </p>

      {/* The one `Dialog.Title` on this surface. `ShellLayer` renders none when
          a banner is given, so this is the accessible name. It wraps: a route
          is two place names and clamping it throws away the destination, which
          is half of what the record is. */}
      <SheetTitle className="text-band font-medium break-words text-hero-foreground">
        {/* `<bdi>` isolates the pair: two place names either side of an arrow is
            exactly the run a surrounding paragraph's direction reorders, and a
            route that reads backwards is not a mirrored layout, it is the wrong
            journey (AC-73). */}
        <bdi>{title}</bdi>
      </SheetTitle>

      {meta.length > 0 && (
        <ul
          role="list"
          className="flex list-none flex-wrap items-center gap-x-3 gap-y-1 text-sm text-hero-muted"
        >
          {meta.map((value, index) => (
            <li key={value} className="flex items-center gap-3">
              {index > 0 && (
                /* A hairline ON the band — `--ev-hero-line`, the token declared
                   for exactly this. A 1px span and not a border on one side,
                   because a physical border does not mirror (§9.1). */
                <span aria-hidden="true" className="h-3 w-px shrink-0 bg-hero-line" />
              )}
              <bdi>{value}</bdi>
            </li>
          ))}
        </ul>
      )}

      {status && (
        /* `w-fit` so the badge is the width of its own word and not of the
           band. Its own row, under the meta line, because it answers a
           different question from the three facts above it. */
        <div className="flex w-fit items-center gap-2">
          <StatusBadge tone={status.tone}>{t(status.key)}</StatusBadge>
          {/* Rare — `types/request.ts` records it as `false` on nearly every
              row — and it changes how the request is dispatched, so it earns a
              place beside the status rather than a field in a grid. */}
          {request?.vip === true && (
            <StatusBadge tone="new">{t('profile.request.band.vip')}</StatusBadge>
          )}
        </div>
      )}
    </div>
  )
}
