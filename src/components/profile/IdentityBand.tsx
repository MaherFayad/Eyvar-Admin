/**
 * **The record, before any container that can be closed.**
 *
 * ## The defect
 *
 * The entity side sheet opened on eight collapsed bars and one open section.
 * A rider's record therefore began with the word `Identity` and a chevron, and
 * the person it was about — their name, whether their account is active, what
 * kind of record this even is — was either inside a collapsible or, in the case
 * of the face, nowhere at all. The owner's reading of it was that the page
 * "looks awfully bad", and the specific thing missing is that **a page about a
 * person showed no person.**
 *
 * Opening three sections instead of one (see `ProfileSections`) reduced the
 * clicks. It did not answer the other half: the first thing on the surface
 * should be the record, not a container.
 *
 * ## Why the drawer and not the full page
 *
 * §7.2 gives the full page a right rail carrying *status, summary and
 * metadata*, and `RAIL_SECTIONS` already omits the identity card from its main
 * column precisely so those facts are not printed twice on one screen. The page
 * has an identity band; it is called the rail, and it is beside the content
 * rather than above it.
 *
 * **The drawer has no rail** — §6.1's anatomy is a header, a scrolling card
 * stack and a footer — so on that surface the facts had nowhere to be except
 * inside the stack. This is that missing region, and it renders only there. A
 * second copy on the page would be the duplication `RAIL_SECTIONS` exists to
 * prevent.
 *
 * ## One derivation, not a second one
 *
 * `statusOf` is imported from `rail.tsx` rather than reimplemented. It is the
 * function that decides an entity's standing for all eleven record kinds, and
 * two implementations of "is this account in good standing" would eventually
 * disagree on one of them, on one surface, silently. The band and the rail say
 * the same word because they call the same function.
 *
 * The flags are deliberately NOT repeated here: `StatusBody` lists every flag
 * that contributes to a standing, which is §11.2's rule and is a paragraph, not
 * a band. The band carries the standing; the section carries the reasons.
 */

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { StatusBadge } from '@/components/StatusBadge'
import { Skeleton } from '@/components/ui/skeleton'
import { initialsOf } from '@/screens/operations/people/cells'
import { statusOf } from './rail'
import type { ProfileRecordResult } from './record'
import type { ProfileRef } from '@/data/types'
import type { Translate } from '@/lib'

/**
 * The record kinds that are a PERSON and therefore get a face.
 *
 * A trip, a subscription, a payment and a plan are not people, and giving
 * `TRP-9104` a circle with `TR` in it invents an identity the record does not
 * have. Those kinds get the same band without the avatar — the name and the
 * standing are still the first things on the surface, which is the point.
 */
const PERSON_KINDS: ReadonlySet<ProfileRef['entityType']> = new Set([
  'rider',
  'new-rider',
  'driver',
  'applicant',
])

export function IdentityBand({
  entity,
  record,
  t,
}: {
  entity: ProfileRef
  record: ProfileRecordResult
  t: Translate
}) {
  const isPerson = PERSON_KINDS.has(entity.entityType)
  const standing = record.data === null ? null : statusOf(record.data, t)

  return (
    <div className="flex items-start gap-3 border-b border-border px-3 py-3">
      {isPerson && (
        <Avatar className="size-10 shrink-0 rounded-full">
          <AvatarFallback className="rounded-full text-sm font-medium">
            {initialsOf(entity.title)}
          </AvatarFallback>
        </Avatar>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
          {/* The record's name at `--text-base`, one step above the 14px body
              and one below the drawer's own title. The drawer header already
              carries the title as the surface's accessible name; this is the
              same string rendered as CONTENT, which is why it is not a heading
              and does not compete for the landmark's label. */}
          <span className="min-w-0 truncate text-base font-semibold text-foreground">
            {entity.title}
          </span>
          {/* What KIND of record this is. Absent from the drawer entirely
              before this: an operator arriving from a search result had the
              name and no statement of whether they were looking at a rider, a
              captain or an applicant. */}
          <span className="shrink-0 text-xs text-muted-foreground">
            {t(`profile.kind.${entity.entityType}`)}
          </span>
        </div>

        {entity.subtitle !== null && (
          /* `<bdi>` for the same reason `fields.tsx` isolates every value: the
             subtitle is a phone number for people and a route for trips, and
             both are Latin runs whose internal separators are bidi-neutral. In
             an Arabic paragraph `+966 53 001 0101` renders backwards without
             this, which is not a mirrored layout but a wrong number. */
          <bdi className="truncate text-xs text-muted-foreground">{entity.subtitle}</bdi>
        )}
      </div>

      {/* The standing, at the band's inline-end. Four states and none of them
          is blank: loading is a skeleton, a resolved standing is its badge, a
          standing R5a refuses to badge is its word, and a record that has not
          resolved shows nothing rather than a badge that would be a guess. */}
      <div className="shrink-0">
        {record.status === 'loading' ? (
          <Skeleton className="h-5 w-16" />
        ) : standing === null ? null : standing.tone === null ? (
          <span className="text-sm text-foreground">{standing.label}</span>
        ) : (
          <StatusBadge tone={standing.tone}>{standing.label}</StatusBadge>
        )}
      </div>
    </div>
  )
}
