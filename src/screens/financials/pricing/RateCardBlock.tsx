/**
 * Rate card — the master-detail block. **AC-RC-01…06, 32…45**.
 *
 * AC-RC-06 one read, so the two-reads-one-cache-key collision stops existing.
 * X-RC-3 the selected row is `bg-selected` plus the shipped ink marker.
 * §7.1 an `<ol>` of `<a href>`: arrows move focus, `Enter` selects.
 * §3 seven type rungs, §4 four spacing rungs — 4 · 8 · 12 · 24 and nothing else.
 */

import { useCallback, useId, useMemo, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { listRateCards } from '@/data/clients'
import type { RateCard, RateCardStatus } from '@/data/types'
import { useAsync, useRovingFocus } from '@/hooks'
import { formatCount, formatDate, formatPercent, type Language, type Translator } from '@/lib'
import { formatSignedPercent } from '@/components/metrics'
import { ErrorState } from '@/components/ErrorState'
import { Money, MoneyCell } from '@/components/Money'
import { StatusBadge } from '@/components/StatusBadge'
import { RefusalLine } from '@/components/table/rowActions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { useShell } from '@/shell/ShellContext'

/** §5.1 — live, then draft newest first, then superseded newest first. */
const RAIL_RANK: Record<RateCardStatus, number> = { live: 0, draft: 1, superseded: 2 }

const TONE: Record<RateCardStatus, 'success' | 'info' | 'neutral'> = {
  live: 'success',
  draft: 'info',
  superseded: 'neutral',
}

/** T2 — a label that HEADS a field: the rail strip, a column header, a band. */
const T2 = 'text-sm font-medium text-muted-foreground'
/** T6 — a label paired with one value, a caption, a refusal, the effective line. */
const T6 = 'text-xs text-muted-foreground'

/** A `IsoDate` from the wire, read at Riyadh midnight so the day cannot slip. */
function dayOf(date: string, language: Language): string {
  return formatDate(`${date}T00:00:00+03:00`, { style: 'day-month', language })
}

/* F-RC-3, one type along — a class name shipped as stored English and reached
   an Arabic operator untranslated. Mapped at the render site; the data is not
   changed, and a class with no key falls back to its stored label. */
function classLabel(id: string, label: string, t: Translator): string {
  const key = `fin.pricing.rateCard.class.${id}`
  return id === 'economy' || id === 'comfort' ? t(key) : label
}

export function RateCardBlock({ gate }: { gate: { canWrite: boolean; reason: string } }) {
  const shell = useShell()
  const { t, language } = shell.language
  const location = useLocation()
  const navigate = useNavigate()
  const headingId = useId()

  const cards = useAsync<RateCard[]>((signal) => listRateCards(signal), {
    deps: [],
    cacheKey: 'pricing.rateCards',
  })

  const ordered = useMemo(
    () =>
      [...(cards.data ?? [])].sort(
        (a, b) =>
          RAIL_RANK[a.status] - RAIL_RANK[b.status] || b.effectiveFrom.localeCompare(a.effectiveFrom),
      ),
    [cards.data],
  )

  /* AC-RC-24 — the selection is `?card=`, owned by this view and deep-linkable.
     `?view=` has one writer (`useScreenViews`) and is untouched here. */
  const requested = new URLSearchParams(location.search).get('card')
  const selected =
    ordered.find((card) => card.version === requested) ?? ordered[0] ?? null

  const hrefFor = useCallback(
    (version: string) => {
      const next = new URLSearchParams(location.search)
      next.set('card', version)
      return { pathname: location.pathname, search: `?${next.toString()}` }
    },
    [location.pathname, location.search],
  )

  if (cards.status === 'loading') return <RateCardSkeleton t={t} />

  if (cards.status === 'error') {
    return (
      <ErrorState
        scope="card"
        message={t('fin.pricing.rateCard.error.read')}
        action={{ label: t('fin.error.retry'), onClick: cards.refetch }}
      />
    )
  }

  /* §10.4 — zero cards ever. The block keeps its rail strip so the operator can
     tell WHAT is missing, renders no illustration (R8), no pane and no footer. */
  if (ordered.length === 0 || selected === null) {
    return (
      <Card className="gap-0 py-0">
        <RailStrip>{t('fin.pricing.rateCard.rail.heading')}</RailStrip>
        <p className="px-3 py-6 text-sm text-muted-foreground">
          {t('fin.pricing.rateCard.empty.body')}
        </p>
      </Card>
    )
  }

  return (
    <Card className="flex-row gap-0 py-0 compact:flex-col">
      <RateCardRail
        cards={ordered}
        selected={selected}
        headingId={headingId}
        hrefFor={hrefFor}
        onSelect={(version) => navigate(hrefFor(version))}
        t={t}
        language={language}
      />
      <RateCardPane card={selected} gate={gate} t={t} language={language} />
    </Card>
  )
}

/* ──────────────────────────────── the rail ─────────────────────────────── */

/* The rail's label strip is the same instrument as a table's header strip,
   because that is what it is: a label over a column of records. Size is not
   heading level — it is an `<h2>` at T2, deliberately (§11). */
function RailStrip({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2
      id={id}
      className={cn('flex h-row-head items-center border-b border-border-soft bg-muted px-3', T2)}
    >
      {children}
    </h2>
  )
}

function RateCardRail({
  cards,
  selected,
  headingId,
  hrefFor,
  onSelect,
  t,
  language,
}: {
  cards: readonly RateCard[]
  selected: RateCard
  headingId: string
  hrefFor: (version: string) => { pathname: string; search: string }
  onSelect: (version: string) => void
  t: Translator
  language: Language
}) {
  const selectedIndex = Math.max(
    0,
    cards.findIndex((card) => card.version === selected.version),
  )
  /* AC-RC-21 — `Tab` lands on the SELECTED row, so the roving hook starts there
     rather than at zero. Arrows move focus only; the `<a>` does the selecting. */
  const roving = useRovingFocus({
    itemCount: cards.length,
    orientation: 'vertical',
    initialIndex: selectedIndex,
  })

  return (
    <div className="flex w-detail-rail shrink-0 flex-col border-e border-border compact:w-full compact:border-e-0 compact:border-b">
      <RailStrip id={headingId}>{t('fin.pricing.rateCard.rail.heading')}</RailStrip>
      <ol ref={roving.containerRef} aria-labelledby={headingId} className="flex flex-col">
        {cards.map((card, index) => {
          const isSelected = card.version === selected.version
          return (
            <li key={card.version} className="relative border-b border-border-soft last:border-b-0">
              {isSelected && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 start-0 w-marker bg-foreground"
                />
              )}
              <Link
                to={hrefFor(card.version)}
                onClick={() => onSelect(card.version)}
                aria-current={isSelected ? 'page' : undefined}
                aria-label={t('fin.pricing.rateCard.rail.select', { version: card.version })}
                {...roving.itemProps(index)}
                className={cn(
                  /* §9 — a MINIMUM, not a fixed height: three lines measure 52px
                     in Latin and 64 in Arabic, and a fixed height would clip. `py-3` is
                     the gutter: three lines already exceed the minimum, so with
                     no vertical padding they press against the row's rules. */
                  'flex min-h-row-media flex-col justify-center gap-1 px-3 py-3',
                  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset focus-visible:outline-none',
                  isSelected ? 'bg-selected' : 'hover:bg-row-hover',
                )}
              >
                <span className="flex items-center gap-2">
                  {/* X-RC-2a — `font-mono` is for the machine identifier alone. */}
                  <span className="min-w-0 flex-1 truncate font-mono text-sm font-medium text-foreground">
                    <bdi>{card.version}</bdi>
                  </span>
                  <span className="ms-auto shrink-0">
                    <StatusBadge tone={TONE[card.status]}>
                      {t(`fin.pricing.rateCard.status.${card.status}`)}
                    </StatusBadge>
                  </span>
                </span>
                <span className={cn('truncate', T6)}>
                  <bdi>{effectiveShort(card, t, language)}</bdi>
                </span>
                <span className={cn('truncate', T6)}>
                  <bdi>{deltaLine(card, t, language)}</bdi>
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
      <RailFooter cards={cards} t={t} language={language} />
    </div>
  )
}

/**
 * §7 — the counts came off the view row. A count of a list belongs to the list,
 * and the space above this line is the list's runway: a runway with a bottom
 * edge reads as a list, one without reads as a hole. Separators are drawn
 * between `<bdi>` fragments, never written into a string (AC-443).
 */
function RailFooter({
  cards,
  t,
  language,
}: {
  cards: readonly RateCard[]
  t: Translator
  language: Language
}) {
  const fragments = useMemo(() => {
    const live = cards.filter((card) => card.status === 'live').length
    const drafts = cards.filter((card) => card.status === 'draft').length
    const superseded = cards.filter((card) => card.status === 'superseded').length
    const out: string[] = []
    if (live === 0) out.push(t('fin.pricing.rateCard.noLive'))
    out.push(t.plural('fin.pricing.rateCard.count.cards', { count: cards.length }))
    if (live > 0) {
      out.push(t('fin.pricing.rateCard.count.live', { count: formatCount(live, language) }))
    }
    if (drafts > 0) out.push(t.plural('fin.pricing.rateCard.count.drafts', { count: drafts }))
    if (superseded > 0) {
      out.push(
        t('fin.pricing.rateCard.count.superseded', { count: formatCount(superseded, language) }),
      )
    }
    return out
  }, [cards, t, language])

  return (
    <p className={cn('mt-auto truncate border-t border-border-soft px-3 py-2', T6)}>
      {fragments.map((fragment, index) => (
        <span key={fragment}>
          {index > 0 && <span aria-hidden="true"> · </span>}
          <bdi>{fragment}</bdi>
        </span>
      ))}
    </p>
  )
}

function effectiveShort(card: RateCard, t: Translator, language: Language): string {
  return card.effectiveTo === null
    ? t('fin.pricing.rateCard.rail.from', { date: dayOf(card.effectiveFrom, language) })
    : t('fin.pricing.rateCard.rail.range', {
        from: dayOf(card.effectiveFrom, language),
        to: dayOf(card.effectiveTo, language),
      })
}

/* AC-RC-03 — a card with no simulation says `Not modelled`, never `0%`. */
function deltaLine(card: RateCard, t: Translator, language: Language): string {
  return card.simulation === null
    ? t('fin.pricing.rateCard.rail.notModelled')
    : t('fin.pricing.rateCard.rail.delta', {
        delta: formatSignedPercent(card.simulation.deltaPercent, language),
      })
}

/* ──────────────────────────────── the pane ─────────────────────────────── */

/**
 * Four bands — identity, prices, terms, impact — and nothing below the fourth.
 * §4.2's rhythm law: a change of subject costs 24px, drawn as 12 above the
 * rule and 12 under it, so the hairline is centred in a G3 channel.
 */
const BAND = 'border-t border-border-soft pt-3'

function RateCardPane({
  card,
  gate,
  t,
  language,
}: {
  card: RateCard
  gate: { canWrite: boolean; reason: string }
  t: Translator
  language: Language
}) {
  const shell = useShell()
  const currentUserId = shell.session?.userId ?? ''
  const headingId = useId()
  const approveReasonId = useId()

  /* AC-404 / AC-405 — both refusals are properties of the draft, read at render.
     Only a draft's pane carries a control at all. */
  const isDraft = card.status === 'draft'
  const approveBlockedReason = !isDraft
    ? null
    : card.proposedByUserId === currentUserId
      ? t('fin.pricing.rateCard.approve.blocked.proposer')
      : card.simulation === null
        ? t('fin.pricing.rateCard.approve.blocked.simulation')
        : t('fin.pricing.rateCard.approve.blocked.stage')

  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-1 flex-col gap-3 py-3">
      {/* §7.1 — one polite region, mounted at all times, its text swapped. */}
      <p role="status" className="sr-only">
        {t('fin.pricing.rateCard.announce', {
          version: card.version,
          status: t(`fin.pricing.rateCard.status.${card.status}`),
        })}
      </p>

      {/* ── band A · identity ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 px-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 id={headingId} className="flex min-w-0 items-center gap-2">
            <bdi className="truncate font-mono text-base font-semibold text-foreground">
              {card.version}
            </bdi>
            <StatusBadge tone={TONE[card.status]}>
              {t(`fin.pricing.rateCard.status.${card.status}`)}
            </StatusBadge>
          </h3>
          {isDraft && (
            <span className="ms-auto shrink-0">
              {/* R3 — `secondary`, and permanently disabled in Stage A. Under
                  D35a it keeps its box, so its refusal reads as an explanation
                  of a control rather than as prose. */}
              <Button
                variant="secondary"
                size="xs"
                disabled
                aria-describedby={approveBlockedReason === null ? undefined : approveReasonId}
              >
                {t('fin.pricing.rateCard.approve')}
              </Button>
            </span>
          )}
        </div>
        <p className={T6}>
          <bdi>
            {card.effectiveTo === null
              ? t('fin.pricing.rateCard.effective.noEnd', {
                  date: dayOf(card.effectiveFrom, language),
                })
              : t('fin.pricing.rateCard.effectiveUntil', {
                  from: dayOf(card.effectiveFrom, language),
                  to: dayOf(card.effectiveTo, language),
                })}
          </bdi>
        </p>
        {isDraft && approveBlockedReason !== null && (
          <RefusalLine id={approveReasonId}>
            {gate.canWrite ? approveBlockedReason : gate.reason}
          </RefusalLine>
        )}
      </div>

      {/* ── band B · prices ───────────────────────────────────────────────── */}
      <div className={BAND}>
        <ClassTable card={card} t={t} />
      </div>

      {/* ── band C · terms ────────────────────────────────────────────────── */}
      <div className={cn('grid grid-cols-2 gap-x-6 gap-y-3 px-3 compact:grid-cols-1', BAND)}>
        <TermsColumn heading={t('fin.pricing.rateCard.terms.heading')}>
          <TermRow label={t('fin.pricing.rateCard.stat.onDemand')}>
            <bdi>{formatPercent(card.commission.onDemandPercent, language)}</bdi>
          </TermRow>
          <TermRow label={t('fin.pricing.rateCard.stat.subscription')}>
            <bdi>{formatPercent(card.commission.subscriptionPercent, language)}</bdi>
          </TermRow>
          <TermRow label={t('fin.pricing.rateCard.stat.riderPrices')}>
            {t(
              card.vatIncluded
                ? 'fin.pricing.rateCard.vat.included'
                : 'fin.pricing.rateCard.vat.excluded',
            )}
          </TermRow>
        </TermsColumn>
        <TermsColumn heading={t('fin.pricing.rateCard.floors.heading')}>
          <TermRow label={t('fin.pricing.rateCard.floors.margin')}>
            <bdi>{formatPercent(card.floors.targetMarginPercent, language)}</bdi>
          </TermRow>
          <TermRow label={t('fin.pricing.rateCard.floors.fee')}>
            <bdi>{formatPercent(card.floors.paymentFeePercent, language)}</bdi>
          </TermRow>
          <TermRow label={t('fin.pricing.rateCard.floors.support')}>
            <Money amount={card.floors.supportCostPerSubscriberHalalas} />
          </TermRow>
          <TermRow label={t('fin.pricing.rateCard.floors.reserve')}>
            <bdi>{formatPercent(card.floors.emergencyReservePercent, language)}</bdi>
          </TermRow>
        </TermsColumn>
        {/* D-F11 / X-RC-10 — one caption for the band, not for one column. */}
        <p className={cn('col-span-2 compact:col-span-1', T6)}>
          {t('fin.pricing.rateCard.floors.caption')}
        </p>
      </div>

      {/* ── band D · impact ───────────────────────────────────────────────── */}
      <ModelledImpact card={card} t={t} language={language} />
    </section>
  )
}

/** One half of band C. Two columns, one instrument; unequal length is fine. */
function TermsColumn({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h4 className={T2}>{heading}</h4>
      <dl className="flex flex-col gap-2">{children}</dl>
    </section>
  )
}

/**
 * A label paired with ONE value: label T6 muted, value at the same rung in ink,
 * separated by colour the way T2 and T3 are. Not `KeyValueRow`, whose `py-1.5`
 * is the 6px §4.3 takes off this view.
 */
function TermRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="min-w-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="shrink-0 text-xs tabular-nums text-foreground">{children}</dd>
    </div>
  )
}

/**
 * Band B — the loudest region on the view (§3.3), bought with the product's own
 * table chrome rather than a bigger glyph. `SAR` is stated once, in a unit rung
 * spanning the five money columns, never in a cell: §8.3.1's purpose kept and
 * its letter deviated from, which needs the owner's line in `docs/RULINGS.md`.
 */
function ClassTable({ card, t }: { card: RateCard; t: Translator }) {
  /* Sized to the widest LABEL each column carries in either language, on the
     4px grid; `Class` declares none and takes the residual, which is the width
     contract `ui/table.tsx` already runs on. Six equal columns left 57% of the
     table empty and still wrapped two headers (F5). */
  const money = [
    ['base', 'w-18'],
    ['perKm', 'w-18'],
    ['perMin', 'w-24'],
    ['minFare', 'w-22'],
    ['cancelFee', 'w-28'],
  ] as const
  return (
    <Table>
      <caption className="sr-only">
        {t('fin.pricing.rateCard.table.caption', { version: card.version })}
      </caption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col" className="text-start">
            {t('fin.pricing.rateCard.col.class')}
          </TableHead>
          {money.map(([column, width]) => (
            <TableHead key={column} scope="col" className={cn('text-end', width)}>
              {t(`fin.pricing.rateCard.col.${column}`)}
            </TableHead>
          ))}
        </TableRow>
        {/* The unit rung (D36). Centred over the money span, never end-aligned:
            end-aligned it sits under the last column and reads as that column's
            unit. `aria-hidden` because a `colspan` announces poorly and the
            `<caption>` states `All figures in SAR.` for the same operator. */}
        <TableRow aria-hidden="true">
          <TableHead className="h-auto pt-0 pb-2" />
          <TableHead
            colSpan={money.length}
            className="h-auto pt-0 pb-2 text-center text-xs font-normal"
          >
            <bdi>{t('fin.pricing.rateCard.table.unit')}</bdi>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {card.classes.map((vehicleClass) => (
          <TableRow key={vehicleClass.id}>
            {/* T3 — the identity column is ink; position separates it from T5. */}
            <TableCell className="font-medium text-foreground">
              {classLabel(vehicleClass.id, vehicleClass.label, t)}
            </TableCell>
            <TableCell className="text-foreground">
              <MoneyCell amount={vehicleClass.baseHalalas} unit="none" />
            </TableCell>
            <TableCell className="text-foreground">
              <MoneyCell amount={vehicleClass.perKmHalalas} unit="none" />
            </TableCell>
            <TableCell className="text-foreground">
              <MoneyCell amount={vehicleClass.perMinHalalas} unit="none" />
            </TableCell>
            <TableCell className="text-foreground">
              <MoneyCell amount={vehicleClass.minFareHalalas} unit="none" />
            </TableCell>
            <TableCell className="text-foreground">
              <MoneyCell amount={vehicleClass.cancelFeeHalalas} unit="none" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/* X-RC-6 / X-RC-7 — three labelled figures and the delta as neutral text, never
   an arrow and never a pill. AC-RC-12 keeps the band label when there is
   nothing to show. */
function ModelledImpact({
  card,
  t,
  language,
}: {
  card: RateCard
  t: Translator
  language: Language
}) {
  const simulation = card.simulation
  return (
    <section className={cn('flex flex-col gap-2 px-3', BAND)}>
      <h4 className={T2}>{t('fin.pricing.rateCard.impact.heading')}</h4>
      {simulation === null ? (
        <p className={T6}>{t('fin.pricing.rateCard.impact.none')}</p>
      ) : (
        <>
          <dl className="flex flex-wrap gap-6">
            <Figure
              label={t('fin.pricing.rateCard.impact.before')}
              value={<Money amount={simulation.riderBeforeHalalas} />}
            />
            <Figure
              label={t('fin.pricing.rateCard.impact.after')}
              value={<Money amount={simulation.riderAfterHalalas} />}
            />
            {/* R4-5 — the delta is NEUTRAL, and it is a labelled figure like the
                two beside it, so nothing on the row is an unlabelled number. */}
            <Figure
              label={t('fin.pricing.rateCard.impact.change')}
              value={<bdi>{formatSignedPercent(simulation.deltaPercent, language)}</bdi>}
            />
          </dl>
          <p className={T6}>
            {t(
              card.status === 'draft'
                ? 'fin.pricing.rateCard.impact.caption.future'
                : 'fin.pricing.rateCard.impact.caption.past',
              {
                trips: formatCount(simulation.trips, language),
                date: formatDate(simulation.ranAt, { style: 'day-month', language }),
              },
            )}
          </p>
        </>
      )}
    </section>
  )
}

/** T6 label over a T4 figure — the two-weight-step boundary, in its own band. */
function Figure({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className={T6}>{label}</dt>
      <dd className="text-sm font-semibold tabular-nums text-foreground">{value}</dd>
    </div>
  )
}

/* ───────────────────────────── the skeleton ────────────────────────────── */

/* AC-RC-43 — rail and pane arrive together: the strip, four rows at
   `min-h-row-media`, the footer, and bands A, B and C. Band D is omitted, since
   its height depends on data that may not exist. No spinner. */
function RateCardSkeleton({ t }: { t: Translator }) {
  return (
    <Card aria-busy="true" className="flex-row gap-0 py-0 compact:flex-col">
      <div className="flex w-detail-rail shrink-0 flex-col border-e border-border compact:w-full compact:border-e-0 compact:border-b">
        <RailStrip>{t('fin.pricing.rateCard.rail.heading')}</RailStrip>
        {[0, 1, 2, 3].map((row) => (
          <div
            key={row}
            className="flex min-h-row-media flex-col justify-center gap-1 border-b border-border-soft px-3 py-3"
          >
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        ))}
        <div className="mt-auto border-t border-border-soft px-3 py-2">
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3 py-3">
        <div className="flex flex-col gap-1 px-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
        <div className={cn('flex flex-col gap-2 px-3', BAND)}>
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex gap-3">
              {[0, 1, 2, 3, 4, 5].map((cell) => (
                <Skeleton key={cell} className="h-3 flex-1" />
              ))}
            </div>
          ))}
        </div>
        <div className={cn('grid grid-cols-2 gap-x-6 gap-y-2 px-3', BAND)}>
          {[0, 1, 2, 3].map((row) => (
            <Skeleton key={row} className="h-3 w-full" />
          ))}
        </div>
      </div>
    </Card>
  )
}
