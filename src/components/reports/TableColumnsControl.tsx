/**
 * §7's columns editor (F-V2-47), shown only in `mode: 'table'`. A column is a
 * free view of a leg this run already resolved (`deriveColumnResults` in
 * `ResultTable.tsx`), never a second query — so it offers only `query.measures`
 * and `query.formula`, the closed set a slice can fill (D9 CQ-3: no control
 * offers what it cannot do).
 */

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { InfoHint, hintLines } from '@/components/InfoHint'
import type { Dimension, Measure, ReportQuery } from '@/data/types'
import type { TableColumn, TableSpec } from '@/data/types/report'
import type { Translator } from '@/lib'

const NONE = '__none__'
const TIME = '__time__'

const DEFAULT_SPEC: TableSpec = { columns: [], rows: ['time'], totals: false, format: [] }

function sameColumn(a: TableColumn, b: TableColumn): boolean {
  if (a.kind !== b.kind) return false
  if (a.kind === 'formula' && b.kind === 'formula') return a.expression === b.expression
  if (a.kind === 'measure' && b.kind === 'measure') return a.ref.key === b.ref.key
  return false
}

export interface TableColumnsControlProps {
  query: ReportQuery
  onChange: (query: ReportQuery) => void
  firstMeasure: Measure | null
  secondMeasure: Measure | null
  dimensions: readonly Dimension[]
  unstarted: boolean
  t: Translator
}

export function TableColumnsControl({
  query,
  onChange,
  firstMeasure,
  secondMeasure,
  dimensions,
  unstarted,
  t,
}: TableColumnsControlProps) {
  const spec = query.table ?? DEFAULT_SPEC
  const setSpec = (next: Partial<TableSpec>) => onChange({ ...query, table: { ...spec, ...next } })

  const offers: { column: TableColumn; label: string }[] = []
  if (query.measures[0]) {
    offers.push({ column: { kind: 'measure', ref: query.measures[0] }, label: firstMeasure ? t(firstMeasure.labelKey) : query.measures[0].key })
  }
  if (query.measures[1]) {
    offers.push({ column: { kind: 'measure', ref: query.measures[1] }, label: secondMeasure ? t(secondMeasure.labelKey) : query.measures[1].key })
  }
  if (query.formula) {
    offers.push({ column: { kind: 'formula', expression: query.formula.expression, label: query.formula.label }, label: query.formula.label })
  }

  const toggle = (column: TableColumn) => {
    const included = spec.columns.some((c) => sameColumn(c, column))
    const columns = included ? spec.columns.filter((c) => !sameColumn(c, column)) : [...spec.columns, column]
    setSpec({ columns })
  }

  const rowDimension = query.groupBy[0] ?? null
  const rowDimensionLabel = rowDimension ? (dimensions.find((d) => d.key === rowDimension)?.labelKey ?? rowDimension) : null
  const rowValue = spec.rows[0] === 'time' ? TIME : (spec.rows[0] ?? NONE)

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <Label id="rb-table-columns-label">{t('rb.control.table.columns')}</Label>
        <InfoHint t={t}>{hintLines([t('rb.control.table.columns.hint')])}</InfoHint>
      </div>

      {unstarted || offers.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t('rb.control.disabled.unstarted')}</p>
      ) : (
        <div role="group" aria-labelledby="rb-table-columns-label" className="flex flex-col gap-1">
          {offers.map((offer) => (
            <label key={offer.label} className="flex items-center gap-1.5 text-sm">
              <Checkbox
                checked={spec.columns.some((c) => sameColumn(c, offer.column))}
                onCheckedChange={() => toggle(offer.column)}
              />
              {offer.label}
            </label>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rb-table-rows">{t('rb.control.table.rows')}</Label>
        <Select
          value={rowValue}
          disabled={unstarted}
          onValueChange={(value) =>
            setSpec({ rows: value === NONE ? [] : value === TIME ? ['time'] : [value] })
          }
        >
          <SelectTrigger id="rb-table-rows" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>{t('rb.control.table.rows.none')}</SelectItem>
            <SelectItem value={TIME}>{t('rb.control.table.rows.time')}</SelectItem>
            {rowDimension && rowDimensionLabel && <SelectItem value={rowDimension}>{t(rowDimensionLabel)}</SelectItem>}
          </SelectContent>
        </Select>
      </div>

      <label className="flex items-center gap-1.5 text-sm">
        <Checkbox
          checked={spec.totals}
          disabled={unstarted}
          onCheckedChange={(checked) => setSpec({ totals: checked === true })}
        />
        {t('rb.control.table.totals')}
      </label>
    </div>
  )
}
