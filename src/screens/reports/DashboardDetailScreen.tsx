/**
 * `/management/reports/dashboards/:dashboardId` (D46). A migrated dashboard
 * answers the same id under `/pages/:pageId` (`dashboardToPage` keeps the
 * id), so this route is now a redirect and nothing else (AC-1210).
 */

import { Navigate, useParams } from 'react-router-dom'

export function DashboardDetailScreen() {
  const { dashboardId = '' } = useParams()
  return <Navigate to={`/management/reports/pages/${dashboardId}`} replace />
}
