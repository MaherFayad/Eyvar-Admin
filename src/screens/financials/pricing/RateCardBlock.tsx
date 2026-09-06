/**
 * Rate card — the master-detail block. **AC-RC-01…24**.
 *
 * AC-RC-06 one read, so the two-reads-one-cache-key collision stops existing.
 * X-RC-3 the selected row is `bg-selected` plus the shipped ink marker.
 * §7.1 an `<ol>` of `<a href>`: arrows move focus, `Enter` selects.
 */

import { useCallback, useId, useMemo, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { listRateCards } from '@/data/clients'
import type { RateCard, RateCardStatus } from '@/data/types'
import { useAsync, useRovingFocus } from '@/hooks'
import { formatCount, formatDate, formatPercent, type Language, type Translator } from '@/lib'
import { formatSignedPercent } from '@/components/metrics'
import { ErrorState } from '@/components/ErrorState'
import { KEY_VALUE_CELL, KEY_VALUE_HEAD, KEY_VALUE_ROW, KeyValueTable } from '@/components/KeyValueGrid'
import { Money, MoneyCell } from '@/components/Money'
import { StatusBadge } from '@/components/StatusBadge'
import { RefusalLine } from '@/components/table/rowActions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useShell } from '@/shell/ShellContext'
import { usePublishFacts, type ViewFacts } from '../shared/ViewRow'

/** §5.1 — live, then draft newest first, then superseded newest first. */
const RAIL_RANK: Record<RateCardStatus, number> = { live: 0, draft: 1, superseded: 2 }

const TONE: Record<RateCardStatus, 'success' | 'info' | 'neutral'> = {
  live: 'success',
  draft: 'info',
  superseded: 'neutral',
}

/** A `IsoDate` from the wire, read at Riyadh midnight so the day cannot slip. */
function dayOf(date: string, language: Language): string {
  return formatDate(`${date}T00:00:00+03:00`, { style: 'day-month', language })
}

export function RateCardBlock({
  gate,
  onFacts,
}: {
  gate: { canWrite: boolean; reason: string }
  onFacts: (facts: ViewFacts | null) => void
}) {
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

  /* §5.4 — the counts ride the view row's caption rung (X-RC-1a), which is the
     one uppercase run this view keeps, and where `No card is live` is stated. */
  const counts = useMemo(() => {
    const live = ordered.filter((card) => card.status === 'live').length
    const drafts = ordered.filter((card) => card.status === 'draft').length
    const superseded = ordered.filter((card) => card.status === 'superseded').length
    return { live, drafts, superseded }
  }, [ordered])

  const facts = useMemo<ViewFacts | null>(() => {
    if (ordered.length === 0) return null
    const caption: string[] = []
    if (counts.live === 0) caption.push(t('fin.pricing.rateCard.noLive'))
    caption.push(t.plural('fin.pricing.rateCard.count.cards', { count: ordered.length }))
    if (counts.live > 0) {
      caption.push(t('fin.pricing.rateCard.count.live', { count: formatCount(counts.live, language) }))
    }
    if (counts.drafts > 0) {
      caption.push(t.plural('fin.pricing.rateCard.count.drafts', { count: counts.drafts }))
    }
    if (counts.superseded > 0) {
      caption.push(
        t('fin.pricing.rateCard.count.superseded', {
          count: formatCount(counts.superseded, language),
        }),
      )
    }
    return { caption }
  }, [ordered.length, counts, t, language])
  usePublishFacts(onFacts, facts)

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

  if (cards.status === 'loading') return <RateCardSkeleton />

  if (cards.status === 'error') {
    return (
      <ErrorState
        scope="card"
        message={t('fin.error.read')}
        action={{ label: t('fin.error.retry'), onClick: cards.refetch }}
      />
    )
  }

  /* §5.4 — zero cards ever. The block keeps its rail heading so the operator can
     tell WHAT is missing, renders no illustration (R8) and renders no pane. */
  if (ordered.length === 0 || selected === null) {
    return (
      <Card className="gap-0 py-0">
        <h3 className="border-b border-border-soft px-3 py-1.5 text-xs font-medium text-muted-foreground">
          {t('fin.pricing.rateCard.rail.heading')}
        </h3>
        <p className="px-3 py-8 text-sm text-muted-foreground">
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
    <div className="w-detail-rail shrink-0 border-e border-border compact:w-full compact:border-e-0 compact:border-b">
      <h3
        id={headingId}
        className="border-b border-border-soft px-3 py-1.5 text-xs font-medium text-muted-foreground"
      >
        {t('fin.pricing.rateCard.rail.heading')}
      </h3>
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
                  'flex h-row-media flex-col justify-center gap-0.5 px-3',
                  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset focus-visible:outline-none',
                  isSelected ? 'bg-selected' : 'hover:bg-row-hover',
                )}
              >
                <span className="flex items-center gap-2">
                  {/* X-RC-2a — `font-mono` is for the machine identifier alone. */}
                  <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">
                    <bdi>{card.version}</bdi>
                  </span>
                  <span className="ms-auto shrink-0">
                    <StatusBadge tone={TONE[card.status]}>
                      {t(`fin.pricing.rateCard.status.${card.status}`)}
                    </StatusBadge>
                  </span>
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  <bdi>{effectiveShort(card, t, language)}</bdi>
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  <bdi>{deltaLine(card, t, language)}</bdi>
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
    </div>
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
     Only a draft's pane carries a control at all (AC-RC-14). */
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

      <div className="flex flex-wrap items-start justify-between gap-3 px-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 id={headingId} className="flex items-center gap-2">
            <bdi className="font-mono text-sm font-semibold text-foreground">{card.version}</bdi>
            <StatusBadge tone={TONE[card.status]}>
              {t(`fin.pricing.rateCard.status.${card.status}`)}
            </StatusBadge>
          </h3>
          <p className="text-xs text-muted-foreground">
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
        </div>
        {/* AC-RC-07 — read off the SELECTED card, so all three change with it. */}
        <dl className="grid grid-cols-3 gap-x-6 gap-y-1 compact:grid-cols-1">
          <Figure
            label={t('fin.pricing.rateCard.stat.onDemand')}
            value={<bdi>{formatPercent(card.commission.onDemandPercent, language)}</bdi>}
          />
          <Figure
            label={t('fin.pricing.rateCard.stat.subscription')}
            value={<bdi>{formatPercent(card.commission.subscriptionPercent, language)}</bdi>}
          />
          <Figure
            label={t('fin.pricing.rateCard.stat.consumerPrices')}
            value={t(
              card.vatIncluded
                ? 'fin.pricing.rateCard.vat.included'
                : 'fin.pricing.rateCard.vat.excluded',
            )}
          />
        </dl>
      </div>

      <ClassTable card={card} t={t} />

      <div className="grid grid-cols-3 gap-3 border-t border-border-soft px-3 pt-3 compact:grid-cols-1">
        <ModelledImpact card={card} t={t} language={language} />
        <Floors card={card} t={t} language={language} />
      </div>

      {card.status === 'live' && (
        <p className="px-3 text-xs text-muted-foreground">{t('fin.pricing.rateCard.footer.live')}</p>
      )}
      {card.status === 'superseded' && card.effectiveTo !== null && (
        <p className="px-3 text-xs text-muted-foreground">
          {t('fin.pricing.rateCard.footer.superseded', {
            date: dayOf(card.effectiveTo, language),
          })}
        </p>
      )}
      {isDraft && (
        <div className="flex flex-col items-start gap-1 px-3">
          <Button
            variant="secondary"
            size="xs"
            disabled
            aria-describedby={approveBlockedReason === null ? undefined : approveReasonId}
          >
            {t('fin.pricing.rateCard.approve')}
          </Button>
          {approveBlockedReason !== null && (
            <RefusalLine id={approveReasonId}>
              {gate.canWrite ? approveBlockedReason : gate.reason}
            </RefusalLine>
          )}
        </div>
      )}
    </section>
  )
}

/** Label over numeral: `--text-xs` grey, `--text-sm` 600 ink, tabular (R4). */
function Figure({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold tabular-nums text-foreground">{value}</dd>
    </div>
  )
}

/* AC-RC-08 — `Class` starts, the five money columns end, `(SAR)` is in the
   header exactly once and never in a cell (§8.3.1). */
function ClassTable({ card, t }: { card: RateCard; t: Translator }) {
  const columns = ['class', 'base', 'perKm', 'perMin', 'minFare', 'cancelFee'] as const
  return (
    <KeyValueTable className="text-sm">
      <caption className="sr-only">
        {t('fin.pricing.rateCard.table.caption', { version: card.version })}
      </caption>
      <thead>
        <tr className="border-y border-border-soft">
          {columns.map((column) => (
            <th
              key={column}
              scope="col"
              className={cn(
                KEY_VALUE_HEAD,
                KEY_VALUE_CELL,
                column === 'class' ? 'text-start' : 'text-end',
              )}
            >
              {t(`fin.pricing.rateCard.col.${column}`)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {card.classes.map((vehicleClass) => (
          <tr key={vehicleClass.id} className={KEY_VALUE_ROW}>
            <td className={cn('py-1.5 text-foreground', KEY_VALUE_CELL)}>{vehicleClass.label}</td>
            <td className={cn('py-1.5', KEY_VALUE_CELL)}>
              <MoneyCell amount={vehicleClass.baseHalalas} unit="none" />
            </td>
            <td className={cn('py-1.5', KEY_VALUE_CELL)}>
              <MoneyCell amount={vehicleClass.perKmHalalas} unit="none" />
            </td>
            <td className={cn('py-1.5', KEY_VALUE_CELL)}>
              <MoneyCell amount={vehicleClass.perMinHalalas} unit="none" />
            </td>
            <td className={cn('py-1.5', KEY_VALUE_CELL)}>
              <MoneyCell amount={vehicleClass.minFareHalalas} unit="none" />
            </td>
            <td className={cn('py-1.5', KEY_VALUE_CELL)}>
              <MoneyCell amount={vehicleClass.cancelFeeHalalas} unit="none" />
            </td>
          </tr>
        ))}
      </tbody>
    </KeyValueTable>
  )
}

/* X-RC-6 / X-RC-7 — two labelled figures, and the delta as neutral text.
   AC-RC-12 keeps the title when there is nothing to show. */
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
    <section className="col-span-2 flex flex-col gap-1 border-e border-border-soft pe-3 compact:col-span-1 compact:border-e-0 compact:pe-0">
      <h4 className="text-xs font-medium text-muted-foreground">
        {t('fin.pricing.rateCard.impact.heading')}
      </h4>
      {simulation === null ? (
        <p className="text-sm text-muted-foreground">{t('fin.pricing.rateCard.impact.none')}</p>
      ) : (
        <>
          <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            <bdi>
              {t('fin.pricing.rateCard.impact.trips', {
                trips: formatCount(simulation.trips, language),
              })}
            </bdi>
            <span aria-hidden="true">·</span>
            <bdi>
              {t('fin.pricing.rateCard.impact.ranAt', {
                date: formatDate(simulation.ranAt, { style: 'day-month', language }),
              })}
            </bdi>
          </p>
          <dl className="flex flex-wrap items-end gap-6">
            <Figure
              label={t('fin.pricing.rateCard.impact.before')}
              value={<Money amount={simulation.riderBeforeHalalas} />}
            />
            <Figure
              label={t('fin.pricing.rateCard.impact.after')}
              value={<Money amount={simulation.riderAfterHalalas} />}
            />
            {/* R4-5 — the delta is NEUTRAL, and it is text, never a pill. */}
            <span className="pb-0.5 text-sm font-semibold tabular-nums text-foreground">
              <bdi>{formatSignedPercent(simulation.deltaPercent, language)}</bdi>
            </span>
          </dl>
          <p className="text-xs text-muted-foreground">
            {t(
              card.status === 'draft'
                ? 'fin.pricing.rateCard.impact.caption.future'
                : 'fin.pricing.rateCard.impact.caption.past',
            )}
          </p>
        </>
      )}
    </section>
  )
}

/* AC-RC-13 — four labelled values and the caption that says nothing enforces
   them (D-F11). */
function Floors({ card, t, language }: { card: RateCard; t: Translator; language: Language }) {
  const rows: Array<{ label: string; value: ReactNode }> = [
    {
      label: t('fin.pricing.rateCard.floors.margin'),
      value: <bdi>{formatPercent(card.floors.targetMarginPercent, language)}</bdi>,
    },
    {
      label: t('fin.pricing.rateCard.floors.fee'),
      value: <bdi>{formatPercent(card.floors.paymentFeePercent, language)}</bdi>,
    },
    {
      label: t('fin.pricing.rateCard.floors.support'),
      value: <Money amount={card.floors.supportCostPerSubscriberHalalas} />,
    },
    {
      label: t('fin.pricing.rateCard.floors.reserve'),
      value: <bdi>{formatPercent(card.floors.emergencyReservePercent, language)}</bdi>,
    },
  ]
  return (
    <section className="flex flex-col gap-1">
      <h4 className="text-xs font-medium text-muted-foreground">
        {t('fin.pricing.rateCard.floors.heading')}
      </h4>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="text-end tabular-nums text-foreground">{row.value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted-foreground">{t('fin.pricing.rateCard.floors.caption')}</p>
    </section>
  )
}

/* ───────────────────────────── the skeleton ────────────────────────────── */

/* AC-RC-16 — rail and pane arrive together, four rows at `h-row-media` with
   three bars each, and no spinner. §5.2: no `LoadingSkeleton` pattern is minted. */
function RateCardSkeleton() {
  return (
    <Card aria-busy="true" className="flex-row gap-0 py-0 compact:flex-col">
      <div className="w-detail-rail shrink-0 border-e border-border compact:w-full compact:border-e-0 compact:border-b">
        <div className="border-b border-border-soft px-3 py-1.5">
          <Skeleton className="h-3 w-20" />
        </div>
        {[0, 1, 2, 3].map((row) => (
          <div
            key={row}
            className="flex h-row-media flex-col justify-center gap-1 border-b border-border-soft px-3 last:border-b-0"
          >
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-3">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex gap-3">
              {[0, 1, 2, 3, 4, 5].map((cell) => (
                <Skeleton key={cell} className="h-3 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
