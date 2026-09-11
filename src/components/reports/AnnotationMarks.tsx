/**
 * §2.4 — a hairline and marker per annotation in the window, drawn as an HTML
 * overlay (Recharts only collects its own element types as SVG children) at
 * the same point-scale bucket centre the plot uses. The hover/focus target is
 * a real `<button>`, keyboard-reachable (§2.4). The axis never mirrors
 * (`rtl.md`), so this overlay is physically positioned, not `dir`-aware.
 */

import { useState } from 'react'
import type { Annotation } from '@/data/types/annotation'
import type { Language } from '@/lib'
import { formatDate } from '@/lib'

export interface AnnotationMarksProps {
  annotations: readonly Annotation[]
  /** The buckets currently drawn (post-brush, if zoomed) — same array `SeriesChart` built its rows from. */
  bucketStarts: readonly string[]
  marginLeft: number
  yAxisWidth: number
  marginRight: number
  language: Language
}

/** The bucket index an annotation's date falls in, or `null` when it is outside every bucket. */
function bucketIndexFor(date: string, bucketStarts: readonly string[]): number | null {
  let index: number | null = null
  for (let i = 0; i < bucketStarts.length; i += 1) {
    const start = bucketStarts[i]
    if (start !== undefined && start <= date) index = i
  }
  return index
}

export function AnnotationMarks({
  annotations,
  bucketStarts,
  marginLeft,
  yAxisWidth,
  marginRight,
  language,
}: AnnotationMarksProps) {
  const [openId, setOpenId] = useState<string | null>(null)
  const count = bucketStarts.length
  if (count === 0) return null

  const marks = annotations
    .map((annotation) => ({ annotation, index: bucketIndexFor(annotation.date, bucketStarts) }))
    .filter((entry): entry is { annotation: Annotation; index: number } => entry.index !== null)

  if (marks.length === 0) return null

  return (
    <div
      aria-hidden={false}
      className="pointer-events-none absolute inset-y-0 top-0 bottom-6"
      style={{ left: marginLeft + yAxisWidth, right: marginRight }}
    >
      {marks.map(({ annotation, index }) => {
        const percent = ((index + 0.5) / count) * 100
        const open = openId === annotation.id
        return (
          <div
            key={annotation.id}
            className="pointer-events-none absolute inset-y-0"
            style={{ left: `${percent}%` }}
          >
            <button
              type="button"
              className="pointer-events-auto absolute inset-y-0 flex w-2 -translate-x-1/2 flex-col items-center outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label={`${annotation.label} · ${formatDate(annotation.date, { style: 'day-month-year', language })}`}
              onMouseEnter={() => setOpenId(annotation.id)}
              onMouseLeave={() => setOpenId((current) => (current === annotation.id ? null : current))}
              onFocus={() => setOpenId(annotation.id)}
              onBlur={() => setOpenId((current) => (current === annotation.id ? null : current))}
            >
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-full"
                style={{ background: 'var(--chart-axis)' }}
              />
              <span aria-hidden="true" className="w-px flex-1" style={{ background: 'var(--chart-axis)' }} />
            </button>
            {open && (
              <div
                role="tooltip"
                className="pointer-events-none absolute top-4 z-10 w-48 -translate-x-1/2 rounded-lg border border-border bg-popover p-2 text-xs shadow-md"
              >
                <p className="font-medium text-foreground">
                  <bdi>{annotation.label}</bdi>
                </p>
                <p className="text-muted-foreground">
                  <bdi>{formatDate(annotation.date, { style: 'day-month-year', language })}</bdi>
                </p>
                {annotation.note && (
                  <p className="mt-1 text-muted-foreground">
                    <bdi>{annotation.note}</bdi>
                  </p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
