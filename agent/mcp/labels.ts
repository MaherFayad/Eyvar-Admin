/**
 * `Measure`/`Dimension` label and caption keys are translation keys, never
 * display strings (AC-894). T1/T2/T3 resolve them against the Report
 * Builder's own English dictionary — the same strings an operator sees.
 */

import { REPORTS_EN } from '../../src/screens/reports/copy'

export function resolveKey(key: string | null): string | null {
  if (key === null) return null
  return REPORTS_EN[key] ?? key
}
