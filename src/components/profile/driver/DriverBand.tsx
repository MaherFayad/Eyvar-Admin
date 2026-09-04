/**
 * The captain sheet's head — the same deep field the rider band uses, carrying
 * a different set of facts because a captain is a different kind of record.
 *
 * ```
 *  +--------------------------------------------------------------+---+
 *  |  CAPTAIN . DRV-0101                                          | X |  hero-label
 *  |  Ahmed Salem                                                 |   |  --text-band
 *  |  Rated 4.9 | Gold tier | Riyadh | Driving since Feb 2025     |   |  hero-muted, text-sm
 *  |  Corolla 2022 . White . Economy                              |   |  hero-label, text-xs
 *  +--------------------------------------------------------------+---+
 * ```
 *
 * ## Two meta rows, because a captain record is two things (D-CP-1)
 *
 * A captain is **a person and a vehicle**; a rider is one thing. That is the
 * only structural fact available at the very top of the screen, and one flat
 * meta row threw it away — six items at one rank, wrapping to three lines at 480
 * and reading as a run-on.
 *
 * The rows differ by rank **and by separator**, and the second difference is
 * what makes them read as two kinds of thing:
 *
 *   - the **person row** is four independent facts, `text-sm text-hero-muted`,
 *     with the band's 1px `bg-hero-line` rules between them, exactly as it
 *     shipped;
 *   - the **vehicle row** is one description of one object, one rank lower at
 *     `text-xs text-hero-label` (5.89 : 1 on `--ev-hero`, the measured eyebrow
 *     rank), joined by `aria-hidden` `·` spans and **no rule**.
 *
 * **No fact leaves the band.** Six items in, six out; only the row is new
 * (AC-CP-04). The builders are `bandPersonMeta` / `bandVehicleMeta` in
 * `facts.tsx` and the **page's band calls the same two**, so the two surfaces
 * cannot disagree about a fact.
 *
 * `clients/profile.ts` builds a rider's `ProfileRef.subtitle` from the phone
 * (`ref(id, 'rider', r.name, r.phone)`) and a captain's from the vehicle
 * (`ref(id, 'driver', d.name, d.vehicle)`). It already says what identifies a
 * captain at a glance is what they drive — the dispatcher looking for a white
 * Corolla is not looking for a phone number. That is why the **vehicle** row is
 * what the ref's subtitle stands in for before the record lands, and why the
 * phone drops to `Identity` with the rest of the contact details.
 *
 * `Driving since Feb 2025`, at month precision, because that is the precision
 * the record has: legacy stores `joined: 'Feb 2025'` and the converter sets the
 * day to 01. A `day-month-year` date here would render a day nobody recorded.
 *
 * Rules applied
 *   §6.2       ONE header. This replaces `ShellLayer`'s chrome bar rather than
 *              sitting under it — the `banner` prop exists so a caller cannot
 *              end up with two.
 *   tokens     `--color-hero*`, the one surface token set that does not invert,
 *              with its contrast measured in `globals.css`: hero-fg 13.44 : 1
 *              for the name, hero-muted 8.61 : 1 for the meta row, hero-label
 *              5.89 : 1 for the eyebrow. **Not `--ev-brand`**, which is a
 *              CONTROL fill measured at 32px — `globals.css` is explicit that a
 *              brand-coloured surface is a different token because *"lightness
 *              means different things at 32px and at 560px"*.
 *   §7.2       the close control takes the band's own ring
 *              (`ring-hero-foreground` on `ring-offset-hero`), because `--ring`
 *              is brand green and brand-green on hero-green is not a visible
 *              ring.
 *   §6.3 D18   the uppercase eyebrow is licensed on the band and nowhere else.
 *              `uppercase` and `tracking-widest` are both no-ops in Arabic by
 *              design, so the eyebrow keeps its size, weight and colour there,
 *              which is what carries it.
 *   AC-73      the id, the vehicle and the rating are each `<bdi>`-isolated.
 *              `Corolla 2022 · White` and `4.9` are Latin runs whose internal
 *              separators are bidi-neutral, so an Arabic paragraph walks their
 *              pieces backwards.
 *   §9.6       nothing here is concatenated. The eyebrow is two independent
 *              labels with a decorative separator hidden from assistive
 *              technology; every meta item is a whole key or a whole field.
 *   §9.1       each meta row is a flex row, so both reverse with the document.
 *              The person row's separators are 1px spans and the vehicle row's
 *              are text nodes — never a border on one physical side.
 */

import { XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SheetClose, SheetTitle } from '@/components/ui/sheet'
import type { Driver, ProfileRef } from '@/data/types'
import type { Language, Translator } from '@/lib'
import { bandPersonMeta, bandVehicleMeta } from './facts'

export interface DriverBandProps {
  entity: ProfileRef
  /** `null` until the record arrives. The name and the id do not wait for it. */
  driver: Driver | null
  t: Translator
  language: Language
}

export function DriverBand({ entity, driver, t, language }: DriverBandProps) {
  /* Built as data so a row can drop an absent fact without leaving an orphan
     separator — the separators are placed BETWEEN what survives, not beside
     what might not. Before the record lands the band still says who this is,
     from the ref that resolved first: nothing waits for the read (§9.2). The
     ref's subtitle IS the vehicle for a captain (`clients/profile.ts`), so it
     stands in on the vehicle row rather than on the person row — putting a car
     where the rating goes would be a rank error, not just a placement one. */
  const person = driver ? bandPersonMeta(driver, t, language) : []
  const vehicle = driver
    ? bandVehicleMeta(driver, t)
    : [entity.subtitle ?? ''].filter((value) => value !== '')

  return (
    <div className="relative flex flex-col gap-2 bg-hero px-6 py-5 text-hero-foreground">
      {/* `SheetClose` is the dismiss `Escape` also reaches, so there is one
          close path and not two. At the band's inline-END, inside the band, so
          it is painted in the ground's own foreground. `✕` never mirrors. */}
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

      {/* What KIND of record, then WHICH one. Two independent labels rather
          than one interpolated string — the kind is a translated noun and the
          id is a Latin code, and gluing them would make one untranslatable run
          out of two correct ones (§9.6). */}
      <p className="flex items-center gap-1.5 pe-8 text-2xs font-medium tracking-widest text-hero-label uppercase">
        <span>{t(`profile.kind.${entity.entityType}`)}</span>
        <span aria-hidden="true">·</span>
        <bdi className="tabular-nums">{entity.entityId}</bdi>
      </p>

      {/* The one `Dialog.Title` on this surface, so the accessible name and the
          visible name are one element and there is no second heading repeating
          it 8px below. It wraps and is never clamped. */}
      <SheetTitle className="text-band font-medium break-words text-hero-foreground">
        {entity.title}
      </SheetTitle>

      {/* The two meta rows are grouped tighter to each other (`gap-1`) than the
          band's own `gap-2`, so they read as one meta block at two ranks rather
          than as two more items in a four-item stack. */}
      {(person.length > 0 || vehicle.length > 0) && (
        <div className="flex flex-col gap-1">
          {person.length > 0 && (
            <ul
              role="list"
              className="flex list-none flex-wrap items-center gap-x-3 gap-y-1 text-sm text-hero-muted"
            >
              {/* Keyed by index because an item may now be a NODE (the star
                  rating) rather than a string, and a node is not a key. The
                  list is a fixed, ordered projection of one record — it is
                  never reordered and never filtered mid-life — so the index is
                  stable for exactly as long as it needs to be. */}
              {person.map((value, index) => (
                <li key={index} className="flex items-center gap-3">
                  {index > 0 && (
                    /* A hairline ON the band — `--ev-hero-line`, the token
                       declared for exactly this. A 1px span and not a border on
                       one side, because a physical border does not mirror
                       (§9.1). */
                    <span aria-hidden="true" className="h-3 w-px shrink-0 bg-hero-line" />
                  )}
                  <bdi>{value}</bdi>
                </li>
              ))}
            </ul>
          )}

          {vehicle.length > 0 && (
            /* One object described, not a list of independent facts — so `·`
               spans and NO `bg-hero-line` rule. That difference in separator is
               deliberate and is what makes the two rows read as two kinds of
               thing (D-CP-1). The `·` is `aria-hidden`: it is punctuation
               between two nodes, never part of either string (§9.6). */
            <ul
              role="list"
              className="flex list-none flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-hero-label"
            >
              {vehicle.map((value, index) => (
                <li key={value} className="flex items-center gap-1.5">
                  {index > 0 && <span aria-hidden="true">·</span>}
                  <bdi>{value}</bdi>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
