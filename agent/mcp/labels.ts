/**
 * `Measure.labelKey`/`captionKey` and `Dimension.labelKey` are translation
 * keys, never display strings (`types/measure.ts`: "AC-894, and a measure
 * name reaches a chart title"). T1/T2/T3 need a readable `label`/`caption`
 * for the model to reason over, so this resolves against the Report
 * Builder's own English dictionary — the same strings an operator sees,
 * never invented here.
 */

import { REPORTS_EN } from '../../src/screens/reports/copy'

export function resolveKey(key: string | null): string | null {
  if (key === null) return null
  return REPORTS_EN[key] ?? key
}
