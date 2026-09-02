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
            /* The first card is open; the rest start collapsed. Opening nine at
               once turns §6.2's stack into the uncollapsible wall it exists to
               replace, and the operator has to scroll past eight cards to find
               the one they came for. Which section is first is the data layer's
               ordering decision, not this component's — so this is `index === 0`
               and not `section === 'identity'`. */
            defaultOpen={index === 0}
          >
            <Renderer entity={entity} record={record} t={t} language={language} />
          </SectionCard>
        )
      })}
    </div>
  )
}
