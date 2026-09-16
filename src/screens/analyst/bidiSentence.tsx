/**
 * AR2 — a raw operator id substituted into a translated sentence still needs
 * `<bdi>` isolation (`PagesView.tsx`'s owner column already does this for a
 * standalone cell); `translate.ts` returns a plain string, so a marker is
 * substituted for the isolated param, the finished sentence is split on it,
 * and the real value is rendered isolated in its place.
 */

import type { ReactNode } from 'react'
import { isolatedRunProps } from '@/lib'
import type { TranslateParams, Translator } from '@/lib'

const BIDI_MARKER = ''

/** `t(key, params)`, with `params[isolate]` rendered inside a `<bdi>` rather than as plain text. */
export function withIsolatedParam(
  t: Translator,
  key: string,
  params: TranslateParams,
  isolate: string,
): ReactNode {
  const marked = t(key, { ...params, [isolate]: BIDI_MARKER })
  const [before, after] = marked.split(BIDI_MARKER)
  return (
    <>
      {before}
      <bdi {...isolatedRunProps().run}>{params[isolate]}</bdi>
      {after}
    </>
  )
}
