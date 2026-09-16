/**
 * AR2 — a raw id inside a translated sentence still needs `<bdi>` isolation.
 * Since `translate.ts` returns a plain string, a marker stands in for the
 * param; the sentence is split on it and the value re-inserted isolated.
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
