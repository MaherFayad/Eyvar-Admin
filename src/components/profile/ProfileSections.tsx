/**
 * **The card stack. One component, both presentations.**
 *
 * The defect this closes had a shape worth naming, because it is easy to
 * rebuild one level up: `ProfileLayer` took a `sectionRenderers` prop and
 * `EntityPageScreen` hardcoded its own fallback, so the drawer and the full page
 * were two independent answers to "what does a profile show". Having `AppLayout`
 * pass a registry into the drawer while the page kept its own would have been
 * the same bug with a longer wire.
 *
 * So neither presentation indexes the registry. **Both render this component**,
 * this component is the only consumer of `PROFILE_SECTION_RENDERERS`, and there
 * is exactly one place where a `ProfileSectionKey` becomes markup. If the two
 * surfaces ever disagree about a section, it will be because someone edited this
 * file, which is a review that can happen.
 *
 * ## Entity kinds differ, and the difference is data
 *
 * `ref.sections` is what a captain has nine of and a rider eight of, and it
 * comes from `SECTIONS` in `clients/profile.ts`. This component maps over it. It
 * has no list of its own, no `entityType` branch, and no knowledge that captains
 * have compliance and riders do not.
 *
 * ## `omit`, and the one deliberate difference between the surfaces
 *
 * §7.2 gives the full page a right rail holding *status, summary and metadata*,
 * and all three are built from the identity record. Rendering the identity card
 * in the main column as well would print the same facts twice on one screen, so
 * the page omits it — `RAIL_SECTIONS` names which key that is, in this file,
 * beside the component that honours it. The drawer has no rail and omits
 * nothing.
 */

import { SectionCard } from './SectionCard'
import { PROFILE_SECTION_RENDERERS, SECTION_TITLE_KEYS } from './sections'
import type { ProfileRecordResult } from './record'
import type { ProfileRef, ProfileSectionKey } from '@/data/types'
import type { Language, Translate } from '@/lib'

/**
 * The sections the full page moves into its right rail (§7.2), and therefore
 * does not repeat in the main column. Declared here so the page cannot omit one
 * the rail does not carry.
 */
export const RAIL_SECTIONS: readonly ProfileSectionKey[] = ['identity']

export interface ProfileSectionsProps {
  entity: ProfileRef
  /**
   * The entity's own record, read **once** by the presentation and shared. See
   * `useProfileRecord`: four cards plus the whole rail derive from it, and one
   * request is the difference between a profile and five of them.
   */
  record: ProfileRecordResult
  t: Translate
  language: Language
  /** Sections this presentation renders elsewhere. The page passes `RAIL_SECTIONS`. */
  omit?: readonly ProfileSectionKey[]
}

/** How many sections start open. See the note at the `defaultOpen` call. */
const DEFAULT_OPEN_SECTIONS = 3

export function ProfileSections({
  entity,
  record,
  t,
  language,
  omit = [],
}: ProfileSectionsProps) {
  const sections = entity.sections.filter((section) => !omit.includes(section))

  return (
    <div className="flex flex-col gap-2">
      {sections.map((section, index) => {
        const Renderer = PROFILE_SECTION_RENDERERS[section]
        return (
          <SectionCard
            key={section}
            title={t(SECTION_TITLE_KEYS[section])}
            /* The first `DEFAULT_OPEN` cards are open; the rest start
               collapsed. Which sections those are is the data layer's ordering
               decision, not this component's — so this is an index test and not
               `section === 'identity'`.

               ── WAS `index === 0`. RAISED TO 3, 2026-09-02. ─────────────────
               The reasoning for collapsing was and is right: opening nine at
               once turns §6.2's stack into the uncollapsible wall it exists to
               replace. Opening ONE was the overcorrection. Measured on the
               entity side sheet: eight sections, one open, **seven clicks to
               read one rider's record** — and because opening does not close a
               neighbour, the panel grows under the reader instead of swapping,
               so those seven clicks also cost seven re-scans.

               Three is the number that fits: the drawer is 480 x ~830 and three
               open sections fill it without a scroll on a typical record, which
               is the most that can be shown before "open" stops meaning
               "visible". Measured after the change, on the same side sheet:
               **seven clicks to five**, and on the nine-section captain page
               eight to six. A real reduction and not a solved problem — see
               below.

               **It is not the whole fix and should not be mistaken for it.**
               The real answer is to open on CONTENT — a section with rows opens,
               an empty one stays shut and says so on its bar — and that is not
               derivable here: `record` is the entity's own row, and each
               section's content is fetched by its own renderer, below this
               component. Doing it properly means lifting emptiness into the
               section contract. Left as the next step rather than faked. */
            defaultOpen={index < DEFAULT_OPEN_SECTIONS}
          >
            <Renderer entity={entity} record={record} t={t} language={language} />
          </SectionCard>
        )
      })}
    </div>
  )
}
