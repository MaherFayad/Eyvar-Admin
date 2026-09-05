/**
 * **The record's identity, in the layer's ONE header.**
 *
 * ## The defect this started as, and the defect it became
 *
 * The entity layer opened on eight collapsed bars and one open section, so a
 * rider's record began with the word `Identity` and a chevron and the person it
 * was about — their name, their standing, what kind of record it even was — was
 * either inside a collapsible or, in the case of the face, nowhere at all. The
 * owner's reading was that the page "looks awfully bad", and the specific thing
 * missing was that **a page about a person showed no person.**
 *
 * The first fix was a BAND: a region above the card stack carrying the avatar,
 * the name, the kind, the subtitle and the standing. It solved that and created
 * a worse one, because `ShellLayer` was already rendering the name and the
 * subtitle as the surface's heading and description eight pixels higher. On
 * `SUB-2003` the result was `SUB-2003` twice and `Weekly Economy` three times
 * before a single fact of the record, and the owner's word for the surface was
 * **redundancy**.
 *
 * So this is no longer a band and no longer a component. It returns the two
 * SLOTS `ShellLayer`'s header places — a face before the name, the kind and the
 * standing after it — and the surface has one header carrying each fact once.
 * The lesson is worth keeping: the fix for *"the record is not on the surface"*
 * is to put it in the header that already exists, not to add a second one.
 *
 * ## Where it renders, and where it does not
 *
 * The layer only. §7.2 gives the full page a right rail carrying *status,
 * summary and metadata*, and `RAIL_SECTIONS` already omits the identity card
 * from the page's main column precisely so those facts are not printed twice on
 * one screen. The page has an identity band; it is called the rail.
 *
 * ## One derivation, not a second one
 *
 * `statusOf` is imported from `rail.tsx` rather than reimplemented. It is the
 * function that decides an entity's standing for all eleven record kinds, and
 * two implementations of "is this account in good standing" would eventually
 * disagree on one of them, on one surface, silently. This and the rail say the
 * same word because they call the same function.
 *
 * The flags are deliberately NOT repeated here: `StatusBody` lists every flag
 * that contributes to a standing, which is §11.2's rule and is a paragraph, not
 * a header. The header carries the standing; the section carries the reasons.
 */

import type { ReactNode } from 'react'
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
 * have. Those kinds return no `lead` at all, and the header simply starts with
 * the name — which is what it did before any of this and reads correctly.
 */
const PERSON_KINDS: ReadonlySet<ProfileRef['entityType']> = new Set([
  'rider',
  'new-rider',
  'driver',
  'applicant',
  'operator',
])

/**
 * **Not a component — a pair of slots.** It returns `{ lead, trail }` for
 * `ShellLayer`'s header rather than rendering a region of its own, because a
 * region of its own is precisely what made the surface have two headers.
 */
export function identityBandSlots({
  entity,
  record,
  t,
}: {
  entity: ProfileRef
  record: ProfileRecordResult
  t: Translate
}): { lead?: ReactNode; trail?: ReactNode } {
  const isPerson = PERSON_KINDS.has(entity.entityType)
  const standing = record.data === null ? null : statusOf(record.data, t)

  /* **The name and the subtitle are NOT here, and their removal is the fix.**
     This band used to render `entity.title` and `entity.subtitle` — both of
     which `ShellLayer` already renders as the surface's heading and its
     description. On `SUB-2003` that put `SUB-2003` and `Weekly Economy` on the
     screen twice before a single field of the record, which is the first thing
     the owner meant by *"a lot of redundancy"*.

     What is left is exactly what the header did NOT say, in the two slots
     `ShellLayer` places: the face BEFORE the name, and what qualifies the
     record AFTER it. */
  return {
    lead: isPerson ? (
      <Avatar className="size-9 shrink-0 rounded-full">
        <AvatarFallback className="rounded-full text-xs font-medium">
          {initialsOf(entity.title)}
        </AvatarFallback>
      </Avatar>
    ) : undefined,
    trail: (
      <>
        {/* What KIND of record this is. Absent from the layer entirely before
            this: an operator arriving from a search result had the name and no
            statement of whether they were looking at a rider, a captain or an
            applicant. */}
        <span className="shrink-0 text-xs text-muted-foreground">
          {t(`profile.kind.${entity.entityType}`)}
        </span>

        {/* The standing. Four states and none of them is blank: loading is a
            skeleton, a resolved standing is its badge, a standing R5a refuses
            to badge is its word, and a record that has not resolved shows
            nothing rather than a badge that would be a guess. */}
        {record.status === 'loading' ? (
          <Skeleton className="h-5 w-16" />
        ) : standing === null ? null : standing.tone === null ? (
          <span className="text-sm text-foreground">{standing.label}</span>
        ) : (
          <StatusBadge tone={standing.tone}>{standing.label}</StatusBadge>
        )}
      </>
    ),
  }
}
