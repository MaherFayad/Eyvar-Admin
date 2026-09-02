/**
 * **The bridge between a screen that owns its copy and a dictionary it cannot
 * register in.**
 *
 * The house rule is that every operator-facing string goes through the screen's
 * `copy.ts` (**AC-74**), and `createTranslator` throws in dev on a key the
 * English dictionary does not have. Three Operations screens — Trips,
 * Subscriptions and Corporate — have no entry in `src/i18n/dictionaries.ts`,
 * and that file has a single owner, so their keys cannot be registered from
 * here.
 *
 * The workaround already in the tree is `t('trip.x', { defaultValue: 'Trip' })`
 * at every call site. It works, and it is why those screens render at all — but
 * it puts the English string in the `.tsx` rather than in a dictionary, which
 * is exactly the arrangement `copy.ts` exists to prevent. Two hundred strings
 * scattered through JSX cannot be reviewed, cannot be handed to a translator,
 * and drift the moment one of them is edited in place.
 *
 * `withFallback` closes that without touching anyone else's file. The screen
 * writes an ordinary `Dictionary` in its own `copy.ts` — **one source of truth,
 * reviewable, exportable, ready to hand over** — and this wraps `t` so that a
 * key the shell has not registered yet resolves against that dictionary instead
 * of throwing.
 *
 * ```ts
 * const tt = withFallback(t, TRIPS_EN)
 * tt('trips.col.captain')                      // 'Captain'
 * tt('trips.meta.other', { count: '128' })      // '128 trips'
 * ```
 *
 * **The day `dictionaries.ts` imports `TRIPS_EN`, this becomes a no-op** —
 * `dictionary[key]` wins over `defaultValue` inside `translate`, so the shell's
 * copy takes over silently and the wrapper can be deleted with a one-line diff
 * per screen. Nothing about the call sites changes.
 *
 * It does **not** paper over a missing key: a key in neither the shell's
 * dictionary nor the screen's own still reaches `onMissingKey` and still throws
 * in dev, which is the behaviour AC-74 depends on.
 *
 * Arabic is unaffected either way. The `ar` dictionary is deliberately empty
 * (see `dictionaries.ts`), so every string in the product already renders its
 * English fallback; this changes where that fallback is written down, not
 * which language appears.
 */

import type { Dictionary, Translate, TranslateParams, Translator } from '@/lib'

export function withFallback(t: Translator, dictionary: Dictionary): Translator
export function withFallback(t: Translate, dictionary: Dictionary): Translate
export function withFallback(t: Translate | Translator, dictionary: Dictionary) {
  const wrapped = (key: string, params?: TranslateParams): string => {
    const fallback = dictionary[key]
    /* `defaultValue` is only consulted when neither the shell's dictionary nor
       its English fallback has the key, so a registered screen keeps the
       registered copy and this wrapper stops mattering. */
    return fallback === undefined ? t(key, params) : t(key, { ...params, defaultValue: fallback })
  }

  /**
   * **`plural` has to survive the wrap, or this helper cannot be used at all.**
   *
   * `Translator` is `Translate` **plus** a plural selector, and the wrapper
   * returned only the call signature — so any screen that renders a count lost
   * `t.plural` the moment it adopted a fallback dictionary. That is most of
   * them: a queue says how many items are breached, a table says how many rows
   * matched. It made the helper unusable exactly where the copy is largest.
   *
   * The plural forms carry the same fallback, because `#one` / `#other` are
   * ordinary keys in the screen's own dictionary.
   */
  const plural = (t as Translator).plural
  if (typeof plural === 'function') {
    return Object.assign(wrapped, {
      plural: (key: string, params: TranslateParams): string => {
        const merged: Record<string, string> = {}
        for (const [k, v] of Object.entries(dictionary)) {
          if (k === key || k.startsWith(`${key}#`) || k.startsWith(`${key}.`)) merged[k] = v
        }
        return Object.keys(merged).length === 0
          ? plural(key, params)
          : plural(key, { ...params, ...pluralFallbacks(merged, key) })
      },
    })
  }
  return wrapped
}

/**
 * The `defaultValue` a plural lookup needs, keyed by the form the selector will
 * ask for. `translate.ts` resolves `<key>#<category>`, so the fallback has to be
 * offered under the same suffix rather than under the bare key.
 */
function pluralFallbacks(merged: Record<string, string>, key: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(merged)) {
    if (k === key) out.defaultValue = v
    else out[`defaultValue${k.slice(key.length)}`] = v
  }
  return out
}
