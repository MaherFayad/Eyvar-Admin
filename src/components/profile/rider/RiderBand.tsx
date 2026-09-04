/**
 * The rider sheet's head — a deep-green field carrying the whole of *who this
 * is*, edge to edge across the top of the layer.
 *
 * ```
 *  ┌──────────────────────────────────────────────────────────────────┬───┐
 *  │  RIDER · RDR-4002                                                │ ✕ │  --color-hero-label
 *  │  الجوهرة بنت عبد العزيز بن سعود آل مقرن العتيبي                  │   │  --text-band, hero-fg
 *  │  +966 59 448 7070 │ On demand │ Tier New │ Riyadh │ Joined 22 Jun │   │  hero-muted
 *  └──────────────────────────────────────────────────────────────────┴───┘
 * ```
 *
 * Rules applied
 *   §6.2       ONE header. This replaces `ShellLayer`'s 48px chrome bar rather
 *              than sitting under it — see the `banner` prop, which exists so a
 *              caller cannot end up with two.
 *   tokens     `--color-hero*`, the only surface token set in the product that
 *              does not invert, with its contrast measured in `globals.css`:
 *              hero-fg 13.44 : 1 for the name, hero-muted 8.61 : 1 for the meta
 *              row, hero-label 5.89 : 1 for the eyebrow. **Not `--ev-brand`.**
 *              The design brief names the brand; the brand is a *control* fill
 *              measured at 32px, and `globals.css` is explicit that a
 *              brand-coloured SURFACE is a different token because "lightness
 *              means different things at 32px and at 560px". `--ev-hero` is
 *              that token, it is what every board band already uses, and using
 *              the control fill here would be a second answer to one question.
 *   §7.2       the close control takes the band's own ring
 *              (`ring-hero-foreground` on `ring-offset-hero`), because
 *              `--ring` is `--ev-brand` and brand-green on hero-green is not a
 *              visible ring. Same treatment `BoardPeriodControl` already uses
 *              for a control resting on this ground.
 *   §9.1       logical utilities throughout. The meta row is a flex row, so it
 *              reverses with the document; its separators are 1px spans rather
 *              than a border on one physical side.
 *   AC-73      the eyebrow's id, the phone and the joined date are each `<bdi>`
 *              -isolated. `RDR-4002` and `+966 59 448 7070` are Latin runs whose
 *              internal separators are bidi-neutral, so an Arabic paragraph
 *              walks their pieces backwards — a phone number that reads
 *              backwards is not a mirrored layout, it is a wrong number.
 *   §9.6       nothing here is concatenated. `Joined {date}` is one key with one
 *              named placeholder; the eyebrow is two independent labels with a
 *              decorative separator that is hidden from assistive technology.
 *
 * ## Why the name WRAPS and is never truncated
 *
 * `الجوهرة بنت عبد العزيز بن سعود آل مقرن العتيبي` is 46 characters, and the
 * chain after the given name is the part that identifies her: `clients/profile.ts`
 * records that legacy's name search *"silently picks one of two people"* when
 * two riders share a surname, and the patronymic chain is what tells them apart.
 * Truncating to `الجوهرة بنت عبد…` throws away precisely the disambiguating
 * half, on the one surface whose whole job is to say who this record is. So the
 * name wraps, with no line clamp, and the band grows. It is the only element on
 * this surface allowed to.
 */

import { XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SheetClose, SheetTitle } from '@/components/ui/sheet'
import type { ProfileRef, Rider } from '@/data/types'
import type { Translate } from '@/lib'

export interface RiderBandProps {
  entity: ProfileRef
  /** `null` until the record arrives. The name and the id do not wait for it. */
  rider: Rider | null
  t: Translate
}

export function RiderBand({ entity, rider, t }: RiderBandProps) {
  /* Built as data so the row can drop an absent fact without leaving an orphan
     separator — the separators are placed BETWEEN what survives, not beside
     what might not. */
  /**
   * **Two facts, not five — owner instruction.** The status, the tier and the
   * joined date came out of the band.
   *
   * **Nothing was lost, and that is why this is legal under §3.** All three are
   * fields in the Identity block on BOTH surfaces (`profile.field.status`,
   * `.tier`, `.joined`), so no fact changed surface, value or rank — the band
   * stopped repeating what the record already states one scroll down. The band
   * keeps the two an operator uses to *reach* this person rather than to
   * describe them: a number to call and a city to place them in.
   *
   * What was actually wrong: five items at this width put a rule between every
   * pair and read as a toolbar of unrelated chips, with `Joined 22 Jun` — the
   * least operational of them — taking the same rank as the phone number.
   */
  const meta: string[] = rider
    ? [
        rider.phone,
        rider.city,
      ].filter((value) => value !== '')
    : [entity.subtitle ?? ''].filter((value) => value !== '')

  return (
    <div className="relative flex flex-col gap-2 bg-hero px-6 py-5 text-hero-foreground">
      {/* The close control, at the band's inline-END and inside the band, so it
          is painted in the ground's own foreground instead of the sheet's ink.
          `SheetClose` is Radix's dismiss — the same one `Escape` reaches, so
          there is one close path and not two (AC-66). */}
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

      {/* The eyebrow: what KIND of record, then WHICH one. Two independent
          labels rather than one interpolated string — the kind is a translated
          noun and the id is a Latin code, and gluing them would make one
          untranslatable run out of two correct ones (§9.6). */}
      <p className="flex items-center gap-1.5 pe-8 text-2xs font-medium tracking-widest text-hero-label uppercase">
        <span>{t(`profile.kind.${entity.entityType}`)}</span>
        <span aria-hidden="true">·</span>
        <bdi className="tabular-nums">{entity.entityId}</bdi>
      </p>

      {/* The one `Dialog.Title` on this surface. `ShellLayer` renders none when
          a banner is given, so this is the accessible name and there is no
          second heading repeating it 8px below. */}
      <SheetTitle className="text-band font-medium break-words text-hero-foreground">
        {entity.title}
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
    </div>
  )
}
