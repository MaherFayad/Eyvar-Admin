/**
 * A column's width — six named fractions over the twelve-twelfths row
 * (§3.4). The house segmented control (`ViewTabs`'s own primitive), the
 * licensed stadium-shape case DESIGN.md's MUST names: a mode switch that
 * changes what the rest of the card shows.
 */

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Translator } from '@/lib'

const WIDTH_OPTIONS: ReadonlyArray<{ width: number; key: string }> = [
  { width: 3, key: 'quarter' },
  { width: 4, key: 'third' },
  { width: 6, key: 'half' },
  { width: 8, key: 'twoThirds' },
  { width: 9, key: 'threeQuarters' },
  { width: 12, key: 'full' },
]

export interface ColumnsWidthControlProps {
  width: number
  /** The sum of every OTHER column's own width in the same row, unset columns counted at the 3-twelfth floor. */
  otherColumnsWidth: number
  onChange: (width: number) => void
  t: Translator
}

export function ColumnsWidthControl({ width, otherColumnsWidth, onChange, t }: ColumnsWidthControlProps) {
  return (
    <Tabs value={String(width)} onValueChange={(value) => onChange(Number(value))} className="w-fit gap-0">
      <TabsList variant="segmented" aria-label={t('pg.edit.columns.width')}>
        {WIDTH_OPTIONS.map((option) => {
          const overflow = otherColumnsWidth + option.width > 12
          return (
            <TabsTrigger
              key={option.width}
              value={String(option.width)}
              disabled={overflow}
              aria-describedby={overflow ? 'pg-columns-overflow' : undefined}
              className="rounded-full border-transparent px-2.5 text-sm data-active:border-border-control data-active:bg-card"
            >
              {t(`pg.edit.columns.${option.key}`)}
            </TabsTrigger>
          )
        })}
      </TabsList>
      <span id="pg-columns-overflow" className="sr-only">
        {t('pg.edit.columns.overflow')}
      </span>
    </Tabs>
  )
}
