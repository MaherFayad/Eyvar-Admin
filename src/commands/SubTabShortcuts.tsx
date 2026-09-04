/**
 * **T6.2 — `g` then a letter jumps to a sub-tab.** Renders nothing; a component
 * so the listener is installed once per document, for the reason AC-29 makes
 * the announcer a singleton. The grammar is `shortcuts.ts`'s; this navigates.
 */

import { useNavigate } from 'react-router-dom'
import { useRouteState } from '@/shell/routeState'
import { useSubTabShortcut } from './shortcuts'

export function SubTabShortcuts() {
  const route = useRouteState()
  const navigate = useNavigate()
  useSubTabShortcut(route.workspaceId, (row) => navigate(row.path))
  return null
}
