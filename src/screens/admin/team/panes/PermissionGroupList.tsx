/**
 * The grouped permission list both editors draw (roles and overrides): a
 * heading per workspace, one row per key, the row's control at the end. The
 * caller decides what the control is; this decides only the shape.
 */

import type { ReactNode } from 'react'
import type { PermissionKey } from '@/data/types'
import type { Translate } from '@/lib'
import { PERMISSION_GROUPS, groupKeys } from '../permissionGroups'

export function PermissionGroupList({
  t,
  control,
  note,
  idPrefix,
}: {
  t: Translate
  control: (key: PermissionKey) => ReactNode
  /** A second line under the sentence, when the row has a fact to add. */
  note?: (key: PermissionKey) => ReactNode
  idPrefix: string
}) {
  return (
    <div className="flex flex-col gap-4">
      {PERMISSION_GROUPS.map((group) => {
        const headingId = `${idPrefix}-group-${group.id}`
        return (
          <section key={group.id} aria-labelledby={headingId} className="flex flex-col gap-1.5">
            <h3 id={headingId} className="text-xs font-semibold text-muted-foreground">
              {t(group.titleKey)}
            </h3>
            <ul className="divide-y divide-border rounded-md border border-border">
              {groupKeys(group).map((key) => (
                <li key={key} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                  <span className="flex min-w-0 flex-col">
                    <span className="text-foreground">{t(`account.permission.${key}`)}</span>
                    {note?.(key)}
                  </span>
                  {control(key)}
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
