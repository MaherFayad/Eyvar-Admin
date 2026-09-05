/**
 * **The route list T8.2 and T9.16 share.** Every row of `routeTable.ts` with
 * `workspaceId` `management` or `operations` — 17 sub-tabs — plus the six
 * `?view=` variants the plan names and the three level-3 details. A module of
 * its own so `ops-routes.mjs` and `chrome.mjs` cannot drift into measuring
 * different sets and reporting one total.
 *
 * `shape` says which assertion applies: `board` and `detail` size to content
 * and `<main>` scrolls them (D-19); `map` and `detail` carry X1's panel, which
 * must be inside the first viewport at 1280.
 */
export const ROUTES = [
  { id: 'mgmt-overview', path: '/management/overview', shape: 'board' },
  { id: 'mgmt-performance', path: '/management/performance', shape: 'board' },
  { id: 'mgmt-risk', path: '/management/risk', shape: 'board' },
  { id: 'mgmt-growth', path: '/management/growth', shape: 'board' },
  { id: 'mgmt-zones', path: '/management/zones', shape: 'map', panels: ['zonesInspector'] },
  { id: 'mgmt-reports', path: '/management/reports', shape: 'table' },
  { id: 'mgmt-dashboards', path: '/management/reports?view=dashboards', shape: 'table' },
  { id: 'mgmt-alerts', path: '/management/reports?view=alerts', shape: 'table' },
  { id: 'mgmt-report-detail', path: '/management/reports/RPT-1', shape: 'board' },
  { id: 'ops-overview', path: '/operations/overview', shape: 'board' },
  { id: 'ops-my-work', path: '/operations/my-work', shape: 'table' },
  {
    id: 'ops-dispatch',
    path: '/operations/dispatch',
    shape: 'map',
    panels: ['dispatchFeed', 'dispatchRail'],
  },
  { id: 'ops-ride-requests', path: '/operations/ride-requests', shape: 'table' },
  { id: 'ops-sub-requests', path: '/operations/subscription-requests', shape: 'table' },
  { id: 'ops-subscriptions', path: '/operations/subscriptions', shape: 'table' },
  { id: 'ops-corporate', path: '/operations/corporate', shape: 'table' },
  {
    id: 'ops-corporate-detail',
    path: '/operations/corporate/CORP-001',
    shape: 'detail',
    panels: ['detailRail'],
  },
  { id: 'ops-quick-rides', path: '/operations/quick-rides', shape: 'table' },
  { id: 'ops-sub-trips', path: '/operations/subscription-trips', shape: 'table' },
  { id: 'ops-assurance', path: '/operations/assurance', shape: 'table' },
  { id: 'ops-assurance-absences', path: '/operations/assurance?view=absences', shape: 'table' },
  { id: 'ops-people-captains', path: '/operations/people', shape: 'table' },
  { id: 'ops-people-applications', path: '/operations/people?view=applications', shape: 'table' },
  { id: 'ops-people-compliance', path: '/operations/people?view=compliance', shape: 'table' },
  { id: 'ops-people-riders', path: '/operations/people?view=riders', shape: 'table' },
  {
    id: 'ops-applicant-detail',
    path: '/operations/people/applications/APP-2201',
    shape: 'detail',
    panels: ['detailRail'],
  },
]
