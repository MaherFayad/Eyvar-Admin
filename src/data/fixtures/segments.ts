/**
 * Saved segments — population filters, `02-report-builder-v2.md` §2.5.
 *
 * `SEG-1`/`SEG-2` are referenced by `RPT-11` (`reports.ts`) as `{ kind:
 * 'saved' }` refs — a segment is a resource with its own identity, read by
 * reference the same way `MeasureRef` reads the catalogue. `SEG-4` carries a
 * `performed` spec that is refused today: no seeded measure declares
 * `supportsPerformed`, so composing it is legal, saving it is legal, and
 * running it returns `segment-performed-unsupported` until the catalogue
 * catches up. `SEG-5` is the long Arabic name (AC-898) — never translated.
 */

import type { Segment } from '../types/segment'

export const segmentFixtures: Segment[] = [
  {
    id: 'SEG-1',
    name: 'Quick ride trips',
    description: 'Trips booked ad hoc, outside a subscription plan.',
    filters: [{ field: 'trip.kind', op: 'eq', value: 'quick' }],
    performed: null,
    ownerId: 'USR-1',
    visibility: 'team',
  },
  {
    id: 'SEG-2',
    name: 'Subscription trips',
    description: 'Trips taken against an active subscription plan.',
    filters: [{ field: 'trip.kind', op: 'eq', value: 'subscription' }],
    performed: null,
    ownerId: 'USR-1',
    visibility: 'team',
  },
  {
    id: 'SEG-3',
    name: 'Active subscribers',
    description: null,
    filters: [{ field: 'subscription.status', op: 'eq', value: 'active' }],
    performed: null,
    ownerId: 'USR-2',
    visibility: 'team',
  },
  {
    id: 'SEG-4',
    name: 'Frequent riders',
    description: 'Five or more completed trips in the bucket. No seeded measure supports this yet.',
    filters: [],
    performed: { measureKey: 'trips.completed', op: 'gte', count: 5, window: 'each-bucket' },
    ownerId: 'USR-2',
    visibility: 'private',
  },
  {
    id: 'SEG-5',
    /* Long enough to find the column that breaks it, and never translated. */
    name: 'الراكبون النشطون في الرياض خلال آخر ثلاثين يوماً قبل موعد تجديد الاشتراك',
    description: 'شريحة تجريبية باسم طويل لاختبار عرضها في قائمة الشرائح',
    filters: [{ field: 'rider.status', op: 'eq', value: 'active' }],
    performed: null,
    ownerId: 'USR-3',
    visibility: 'private',
  },
  {
    /* The degenerate case, named: a segment that filters nothing. Distinct
       from omitting `segments` on the query, which also means "everyone" —
       this is the same population, chosen on purpose and saved as a record. */
    id: 'SEG-6',
    name: 'All riders',
    description: null,
    filters: [],
    performed: null,
    ownerId: 'USR-1',
    visibility: 'team',
  },
]
