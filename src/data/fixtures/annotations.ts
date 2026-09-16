/**
 * Annotations — marked dates on a trend chart, `02-report-builder-v2.md` §4.5.
 * Context, never query state. Six, one per `AnnotationKind` plus a second
 * `incident` inside the snapshot coverage window, so a 30-day trend chart
 * draws at least one mark without widening the range.
 */

import { offsetFromNow } from '../mock/clock'
import type { Annotation } from '../types/annotation'

export const annotationFixtures: Annotation[] = [
  {
    id: 'ANN-1',
    date: '2025-08-15',
    label: 'Eyvar Plus launched',
    note: 'The higher subscription tier opened to new sign-ups in Riyadh and Jeddah.',
    kind: 'launch',
    createdBy: 'USR-1',
    createdAt: offsetFromNow({ days: -314 }),
  },
  {
    id: 'ANN-2',
    date: '2025-10-01',
    label: 'Quick ride base fare raised',
    note: 'Base fare moved from SAR 10 to SAR 12 across all cities.',
    kind: 'price',
    createdBy: 'USR-2',
    createdAt: offsetFromNow({ days: -267 }),
  },
  {
    id: 'ANN-3',
    date: '2025-12-20',
    label: 'Year-end referral push',
    note: 'Referral bonus doubled for two weeks over the holiday period.',
    kind: 'campaign',
    createdBy: 'USR-1',
    createdAt: offsetFromNow({ days: -187 }),
  },
  {
    id: 'ANN-4',
    date: '2026-02-10',
    label: 'Riyadh flooding',
    note: 'Heavy rain grounded dispatch in central Riyadh for roughly six hours.',
    kind: 'incident',
    createdBy: 'USR-5',
    createdAt: offsetFromNow({ days: -135, hours: 2 }),
  },
  {
    id: 'ANN-5',
    date: '2026-04-05',
    label: 'Ramadan operating hours',
    note: 'Dispatch shifted to cover the extended evening demand window.',
    kind: 'other',
    createdBy: 'USR-1',
    createdAt: offsetFromNow({ days: -81 }),
  },
  {
    id: 'ANN-6',
    /* Inside the 30-day and snapshot windows most trend charts open to, so an
       operator sees a mark without widening the range. Also the candidate
       cause the analyst's seeded case study (`agent.ts`) weighs and rejects. */
    date: '2026-06-10',
    label: 'Payment gateway outage',
    note: 'Card payments failed for roughly two hours; cash and wallet rides were unaffected.',
    kind: 'incident',
    createdBy: 'USR-2',
    createdAt: offsetFromNow({ days: -15, hours: 3 }),
  },
]
