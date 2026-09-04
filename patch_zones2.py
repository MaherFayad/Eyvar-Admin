# -*- coding: utf-8 -*-
"""T7.3 part 2 - the columns and the two surfaces."""
import io

P = 'src/screens/management/zones/ZonesScreen.tsx'
s = io.open(P, encoding='utf-8').read()


def rep(old, new):
    global s
    assert old in s, 'NOT FOUND: ' + old[:90]
    s = s.replace(old, new, 1)


COLUMNS = """
  /**
   * **The P1 table, restored as the second view (T7.3, owner decision O5).**
   * A city with thirty zones is a list you query, and sort, the column picker,
   * the filter menu, CSV and paging are index-table affordances the map cannot
   * offer. Widths are the ones the table shipped with; the actions column is
   * declared rather than a kebab because R4-6 §6.4 clause 2 requires both
   * controls visible at rest.
   */
  const columns = useMemo<DataColumn<Zone>[]>(
    () => [
      {
        id: 'zone',
        header: t('zones.col.zone'),
        dataType: 'text',
        minWidth: 190,
        sortField: 'name',
        alwaysVisible: true,
        cell: (zone) => (
          <span className="relative block font-medium">
            {/* R5a use #3 - a starved zone carries the leading edge, and the
                priority label beside it carries the words. */}
            {zone.starved && <RowCriticalMarker />}
            {zone.name}
          </span>
        ),
        secondaryLine: (zone) => {
          const failure = actions.failure(zone.id)
          if (failure) {
            return (
              <ErrorState
                scope="row"
                message={failure.message}
                action={{ label: t('zones.error.retry'), onClick: failure.retry }}
              />
            )
          }
          return zone.city
        },
      },
      {
        id: 'demandSupply',
        header: t('zones.col.demandSupply'),
        dataType: 'number',
        align: 'end',
        width: 152,
        sortField: 'demandSupplyRatio',
        /* **R4-12** - the operands are in the second line, the value is the
           bare ratio, and a zone with no captains renders `ABSENT` rather than
           `Infinity`. */
        cell: (zone) => (
          <span
            className="block text-end tabular-nums"
            aria-label={zone.demandSupplyRatio === null ? ABSENT : undefined}
          >
            {zone.demandSupplyRatio === null
              ? ABSENT
              : formatRatio(zone.demandSupplyRatio, language)}
          </span>
        ),
        secondaryLine: (zone) => (
          <span className="block text-end tabular-nums">
            {t('zones.demandSupply.detail', {
              demand: formatCount(zone.demand, language),
              supply: formatCount(zone.supply, language),
            })}
          </span>
        ),
      },
      {
        id: 'failureRate',
        header: t('zones.col.failureRate'),
        dataType: 'number',
        align: 'end',
        width: 140,
        sortField: 'failureRate',
        /* The table's default order is this column, worst first (`:14132`). */
        cell: (zone) => (
          <span className="block text-end tabular-nums">
            {formatPercent(zone.failureRate, language)}
          </span>
        ),
        secondaryLine: (zone) => (
          <span className="block text-end">
            {t('zones.unserved.detail', {
              count: formatCount(zone.failures30d, language),
            })}
          </span>
        ),
      },
      {
        id: 'captainsNeeded',
        header: t('zones.col.captainsNeeded'),
        dataType: 'number',
        align: 'end',
        width: 148,
        sortField: 'captainsNeeded',
        /* O9 - blank, not a fill: a healthy zone has no recruitment target,
           and `0` would read as a reassurance somebody could act on. */
        cell: (zone) => (
          <span className="block text-end tabular-nums">
            {zone.captainsNeeded === 0 ? '' : formatCount(zone.captainsNeeded, language)}
          </span>
        ),
      },
      {
        id: 'subMomentum',
        header: t('zones.col.subMomentum'),
        dataType: 'number',
        align: 'end',
        width: 152,
        sortField: 'subMomentum',
        /* **`null` when no subscription request maps to this zone at all.** A
           `0` would claim we measured flat growth. */
        cell: (zone) => (
          <span
            className="block text-end tabular-nums"
            aria-label={zone.subMomentum === null ? ABSENT : undefined}
          >
            {zone.subMomentum === null ? ABSENT : formatPercent(zone.subMomentum, language)}
          </span>
        ),
      },
      {
        id: 'priority',
        header: t('zones.col.priority'),
        dataType: 'enum',
        width: 150,
        cell: (zone) => (
          <StatusBadge tone={RECRUITMENT_PRIORITY_TONE[zone.recruitmentPriority]}>
            {t(`zones.priority.${zone.recruitmentPriority}`)}
          </StatusBadge>
        ),
        filter: {
          kind: 'select',
          field: 'recruitmentPriority',
          options: (['recruit-now', 'watch', 'healthy'] as const).map((value) => ({
            value,
            label: t(`zones.priority.${value}`),
          })),
        },
      },
      {
        id: 'actions',
        header: t('zones.col.actions'),
        dataType: 'enum',
        width: 250,
        /* **R4-6 §6.4 clause 2** - two actions, both direct, both labelled,
           both visible at rest. Each is disabled in place with its own reason
           when it cannot be used (§11.2). */
        cell: (zone) => (
          <span className="flex items-center gap-1">
            <Button
              variant="secondary"
              size="xs"
              disabled={!canWrite || zone.activeSteerOffer !== null}
              title={
                zone.activeSteerOffer !== null
                  ? t('zones.steer.blocked.live')
                  : canWrite
                    ? undefined
                    : t('zones.blocked.permission')
              }
              onClick={() => steer(zone)}
            >
              {t('zones.action.steer')}
            </Button>
            <Button
              variant="secondary"
              size="xs"
              disabled={!canWrite || zone.recruitmentQueuedAt !== null}
              title={
                zone.recruitmentQueuedAt !== null
                  ? t('zones.recruit.blocked.queued')
                  : canWrite
                    ? undefined
                    : t('zones.blocked.permission')
              }
              onClick={() => recruit(zone)}
            >
              {t('zones.action.recruit')}
            </Button>
          </span>
        ),
      },
    ],
    [t, language, canWrite, actions, steer, recruit],
  )

"""

rep("""
  return (
    <SingleColumnPage""", COLUMNS + """
  return (
    <SingleColumnPage""")

# ── the band gains the surface switch ─────────────────────────────────────
rep("""          <div className="flex min-w-0 flex-col gap-3">
            <h1 className="text-band font-medium text-hero-foreground">{t(row.titleKey)}</h1>""",
    """          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="flex min-w-0 flex-col gap-3">
            <h1 className="text-band font-medium text-hero-foreground">{t(row.titleKey)}</h1>""")

rep("""              </span>
            )}
          </div>
        </BoardBand>""",
    """              </span>
            )}
          </div>

          {/* **The view switch (T7.3).** A map answers *where is demand
              starved*; a table answers *which of thirty zones do I act on*.
              The same underlined tab the console uses everywhere else, on the
              band because the choice is about the whole board. */}
          <Tabs value={surface} onValueChange={setSurface} className="gap-0">
            <TabsList variant="line" aria-label={t('zones.view.label')} className="h-auto gap-4 p-0">
              <TabsTrigger value="map" className="h-auto flex-none px-0 pb-1.5 text-xs">
                {t('zones.view.map')}
              </TabsTrigger>
              <TabsTrigger value="table" className="h-auto flex-none px-0 pb-1.5 text-xs">
                {t('zones.view.table')}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          </div>
        </BoardBand>""")

# ── the map renders on its own surface only ───────────────────────────────
rep("""        {(zones.status === 'loading' || zones.status === 'content') && (
          <ZonesMapView""",
    """        {surface === 'map' && (zones.status === 'loading' || zones.status === 'content') && (
          <ZonesMapView""")

io.open(P, 'w', encoding='utf-8').write(s)
print('ok')
