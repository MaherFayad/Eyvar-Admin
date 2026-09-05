/**
 * The product-analytics seam (`build/03-analytics-plan.md`). `track` records an
 * event name and flat properties; subscribers forward them to whichever vendor
 * the owner picks. Until one is wired, events are held in memory for tests.
 */

export type AnalyticsProps = Record<string, string | number | boolean | null>

export interface AnalyticsEvent {
  name: string
  props: AnalyticsProps
}

type Sink = (event: AnalyticsEvent) => void

const sinks = new Set<Sink>()
const recent: AnalyticsEvent[] = []

export function track(name: string, props: AnalyticsProps = {}): void {
  const event = { name, props }
  recent.push(event)
  if (recent.length > 200) recent.shift()
  for (const sink of sinks) sink(event)
}

export function onTrack(sink: Sink): () => void {
  sinks.add(sink)
  return () => {
    sinks.delete(sink)
  }
}

/** Events recorded so far, newest last. For tests. */
export function recentEvents(): readonly AnalyticsEvent[] {
  return recent
}

export function resetAnalytics(): void {
  recent.length = 0
}
