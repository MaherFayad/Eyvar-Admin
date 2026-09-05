/**
 * Who a record is about: a rider, a captain or a corporate account, found by
 * name or id over the global search seam. Shared by the ticket, claim and
 * lost-property forms so one requester reads the same way on all three.
 */

import { useMemo, useState } from 'react'
import { search } from '@/data/clients'
import type { SearchResult } from '@/data/types'
import { useAsync } from '@/hooks'
import type { Translate } from '@/lib'
import { Button } from '@/components/ui/button'
import { FieldControl } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

export type RequesterType = 'rider' | 'driver' | 'corporate'

export interface Requester {
  entityId: string
  entityName: string
  entityType: RequesterType
}

export function requesterFromSearch(result: SearchResult): Requester | null {
  if (result.kind !== 'entity' || !('entityId' in result.target)) return null
  const type = result.target.entityType
  const entityType: RequesterType | null =
    type === 'rider' ? 'rider' : type === 'driver' ? 'driver' : type === 'corporate-account' ? 'corporate' : null
  if (entityType === null) return null
  return { entityId: result.target.entityId, entityName: result.title, entityType }
}

export interface RequesterPickerProps {
  value: Requester | null
  onChange: (next: Requester | null) => void
  /** Which kinds the form accepts. A lost-property report is a rider's; a claim can be a captain's. */
  accept: readonly RequesterType[]
  /** `true` when the caller supplied the requester and it may not change. */
  locked?: boolean
  placeholderKey: string
  t: Translate
  /** Prefix for `.searching`, `.none` and `.change`. */
  copyPrefix: string
}

export function RequesterPicker({
  value,
  onChange,
  accept,
  locked = false,
  placeholderKey,
  t,
  copyPrefix,
}: RequesterPickerProps) {
  const [query, setQuery] = useState('')
  const active = !locked && value === null && query.trim().length >= 2
  const matches = useAsync((signal) => search(query, { limit: 8 }, signal), {
    deps: [query],
    enabled: active,
  })
  const candidates = useMemo(
    () =>
      (matches.data?.results ?? [])
        .map(requesterFromSearch)
        .filter((r): r is Requester => r !== null && accept.includes(r.entityType)),
    [matches.data, accept],
  )

  if (value !== null) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-foreground">{value.entityName}</span>
          <bdi className="font-mono text-muted-foreground">{value.entityId}</bdi>
        </span>
        {!locked && (
          <Button variant="ghost" size="xs" onClick={() => onChange(null)}>
            {t(`${copyPrefix}.change`)}
          </Button>
        )}
      </div>
    )
  }

  return (
    <>
      <FieldControl>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t(placeholderKey)}
          autoComplete="off"
        />
      </FieldControl>
      {active && (
        <ul className="mt-1 flex flex-col rounded-md border border-border" aria-label={t(placeholderKey)}>
          {candidates.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted-foreground">
              {matches.status === 'loading' ? t(`${copyPrefix}.searching`) : t(`${copyPrefix}.none`)}
            </li>
          ) : (
            candidates.map((candidate) => (
              <li key={candidate.entityId}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-start text-xs hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  onClick={() => onChange(candidate)}
                >
                  <span className="font-medium text-foreground">{candidate.entityName}</span>
                  <bdi className="font-mono text-muted-foreground">{candidate.entityId}</bdi>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </>
  )
}
