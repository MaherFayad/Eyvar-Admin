/**
 * What a permission set opens, drawn from the route table through the same
 * functions the router gates with (AC-924, D17): a workspace renders when one
 * sub-tab is visible, a sub-tab renders as read-and-act or read-only, and
 * anything the set cannot see is absent rather than greyed (§2.3).
 */

import { getRouteTable } from '@/data/clients'
import type { PermissionKey } from '@/data/types'
import type { Translate } from '@/lib'
import { canWriteSubTab, visibleSubTabs, visibleWorkspaces, type PermissionContext } from '@/shell/permissions'

export interface AccessPreviewProps {
  permissions: readonly PermissionKey[]
  t: Translate
  /** Names the block for assistive tech; defaults to the dictionary's title. */
  label?: string
}

export function AccessPreview({ permissions, t, label }: AccessPreviewProps) {
  const table = getRouteTable()
  /* No server-derived map here: the row's own key decides, which is the same
     fallback the shell takes when the server did not say. */
  const ctx: PermissionContext = { permissions, subTabPermissions: {} }
  const workspaces = visibleWorkspaces(ctx, table.workspaces, table.subTabs)

  return (
    <section
      aria-label={label ?? t('access.preview.title')}
      className="flex flex-col gap-2 rounded-lg border border-border bg-muted/20 p-3 text-xs"
    >
      <h4 className="text-xs font-semibold text-foreground">{label ?? t('access.preview.title')}</h4>
      {workspaces.length === 0 ? (
        <p className="text-muted-foreground">{t('access.preview.none')}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-2 compact:grid-cols-1">
          {workspaces.map((workspace) => (
            <li key={workspace.id} className="flex min-w-0 flex-col gap-0.5">
              <span className="font-medium text-foreground">{t(workspace.titleKey)}</span>
              <ul className="flex flex-col">
                {visibleSubTabs(ctx, table.subTabs, workspace.id).map((row) => {
                  const writes = canWriteSubTab(ctx, row)
                  return (
                    <li key={row.subTabId} className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-foreground">{t(row.titleKey)}</span>
                      {/* §7.5: the marker pairs with a word, never a glyph alone. */}
                      <span className="shrink-0 text-muted-foreground">
                        <span aria-hidden="true">{writes ? '●' : '◐'} </span>
                        {t(writes ? 'access.preview.full' : 'access.preview.view')}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
